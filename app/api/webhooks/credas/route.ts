/**
 * POST /api/webhooks/credas
 *
 * Receives event notifications from Credas when a process completes.
 * Updates the enquiry's onboarding_data and compliance status.
 *
 * Credas webhook payload format:
 * {
 *   "ProcessId": "xxx",
 *   "ClientId": "xxx",
 *   "Status": 2,
 *   "StatusDescription": "The process is complete"
 * }
 *
 * Status values:
 * 2 = The process is complete
 */

import { NextResponse } from "next/server"
import { createAdminClient, logActivity } from "@/lib/database"
import { validateCredasWebhook, getCredasEntitySummary } from "@/lib/credas"

const WEBHOOK_SECRET = process.env.CREDAS_WEBHOOK_SECRET || ""

interface CredasWebhookPayload {
  ProcessId: string
  ClientId: string
  Status: number
  StatusDescription: string
}

export async function POST(request: Request) {
  const rawBody = await request.text()

  // Signature validation (if secret is configured)
  const signature = request.headers.get("x-credas-signature") || ""

  if (WEBHOOK_SECRET && !validateCredasWebhook(rawBody, signature, WEBHOOK_SECRET)) {
    console.error("[credas-webhook] Signature mismatch — rejecting request")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: CredasWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    console.error("[credas-webhook] Invalid JSON:", rawBody)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { ProcessId, ClientId, Status, StatusDescription } = payload

  console.log("[credas-webhook] Received:", { ProcessId, ClientId, Status, StatusDescription })

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  // Find enquiry by looking up the ProcessId in onboarding_data
  // The ProcessId is stored as either credas_aml_invite_id or credas_sof_invite_id
  const { data: enquiries, error: enquiryError } = await adminClient
    .from("enquiries")
    .select("*")
    .or(`onboarding_data->credas_aml_invite_id.eq.${ProcessId},onboarding_data->credas_sof_invite_id.eq.${ProcessId}`)

  if (enquiryError) {
    console.error("[credas-webhook] Query error:", enquiryError)
    return NextResponse.json({ error: "Query failed" }, { status: 500 })
  }

  // If JSONB query doesn't work, try a different approach - fetch all recent enquiries
  let enquiry = enquiries?.[0]
  
  if (!enquiry) {
    // Fallback: Try to find by iterating (less efficient but more reliable)
    console.log("[credas-webhook] Trying fallback lookup...")
    const { data: allEnquiries } = await adminClient
      .from("enquiries")
      .select("*")
      .not("onboarding_data", "is", null)
      .order("updated_at", { ascending: false })
      .limit(100)
    
    enquiry = allEnquiries?.find(e => {
      const data = e.onboarding_data || {}
      return data.credas_aml_invite_id === ProcessId || data.credas_sof_invite_id === ProcessId
    })
  }

  if (!enquiry) {
    console.error("[credas-webhook] Enquiry not found for ProcessId:", ProcessId)
    // Return 200 so Credas doesn't retry - we just can't find the enquiry
    return NextResponse.json({ received: true, matched: false })
  }

  console.log("[credas-webhook] Found enquiry:", enquiry.id)

  const onboardingData = enquiry.onboarding_data || {}

  // Determine which check type this ProcessId belongs to
  const isAml = onboardingData.credas_aml_invite_id === ProcessId
  const isSof = onboardingData.credas_sof_invite_id === ProcessId
  const checkType = isAml ? "aml" : isSof ? "source_of_funds" : "unknown"

  const isComplete = Status === 2

  // Build updated onboarding_data
  let updatedData = { ...onboardingData }
  let activityDescription: string

  if (isComplete) {
    if (isAml) {
      updatedData = {
        ...updatedData,
        id_verification: {
          ...updatedData.id_verification,
          started: true,
          completed: true,
          completed_at: now,
          provider: "credas",
          status: "approved",
        },
        credas_aml_raw_response: {
          received_at: now,
          process_id: ProcessId,
          client_id: ClientId,
          status: Status,
          status_description: StatusDescription,
        },
      }
      activityDescription = `Credas Identity/AML check completed successfully`
    } else if (isSof) {
      updatedData = {
        ...updatedData,
        source_of_funds: {
          ...updatedData.source_of_funds,
          started: true,
          completed: true,
          completed_at: now,
          provider: "credas",
          status: "approved",
        },
        credas_sof_raw_response: {
          received_at: now,
          process_id: ProcessId,
          client_id: ClientId,
          status: Status,
          status_description: StatusDescription,
        },
      }
      activityDescription = `Credas Source of Funds check completed successfully`
    } else {
      activityDescription = `Credas check completed (ProcessId: ${ProcessId})`
    }
  } else {
    // Not complete - might be in progress or failed
    activityDescription = `Credas webhook received: ${StatusDescription} (Status: ${Status})`
  }

  // Update enquiry
  const { error: updateError } = await adminClient
    .from("enquiries")
    .update({
      onboarding_data: updatedData,
      updated_at: now,
    })
    .eq("id", enquiry.id)

  if (updateError) {
    console.error("[credas-webhook] Failed to update enquiry:", updateError)
    return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 })
  }

  // Check if all required steps are now complete
  const amlDone = updatedData.id_verification?.completed === true
  const sofDone = updatedData.source_of_funds?.completed === true

  if (amlDone && sofDone) {
    // Both checks passed — mark onboarding as compliance-complete
    await adminClient
      .from("enquiries")
      .update({
        onboarding_status: "compliance_complete",
        updated_at: now,
      })
      .eq("id", enquiry.id)

    await logActivity({
      enquiryId: enquiry.id,
      actorType: "webhook",
      action: "onboarding_compliance_complete",
      description: "All Credas checks passed — onboarding marked compliance complete",
    })
  }

  // Log activity
  await logActivity({
    enquiryId: enquiry.id,
    actorType: "webhook",
    action: isComplete ? "credas_check_completed" : "credas_webhook_received",
    description: activityDescription,
    metadata: {
      process_id: ProcessId,
      status: Status,
      check_type: checkType,
    },
  })

  console.log("[credas-webhook] Successfully processed webhook for enquiry:", enquiry.id)

  // Always return 200 to Credas so they don't retry
  return NextResponse.json({ received: true, matched: true })
}

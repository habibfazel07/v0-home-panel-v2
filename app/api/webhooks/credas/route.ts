/**
 * POST /api/webhooks/credas
 *
 * Receives event notifications from Credas when a check completes,
 * fails, or expires. Updates the enquiry's onboarding_data and
 * compliance status accordingly.
 *
 * Credas sends the header: X-Credas-Signature: sha256=<hmac>
 * Set CREDAS_WEBHOOK_SECRET in env to enable signature validation.
 */

import { NextResponse } from "next/server"
import { createAdminClient, logActivity } from "@/lib/database"
import { validateCredasWebhook, CredasWebhookPayload } from "@/lib/credas"

const WEBHOOK_SECRET = process.env.CREDAS_WEBHOOK_SECRET || ""

export async function POST(request: Request) {
  const rawBody = await request.text()

  // ── Signature validation ─────────────────────────────────────────
  const signature = request.headers.get("x-credas-signature") || ""

  if (WEBHOOK_SECRET && !validateCredasWebhook(rawBody, signature, WEBHOOK_SECRET)) {
    console.error("[credas-webhook] Signature mismatch — rejecting request")
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: CredasWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { event, inviteId, referenceId, status, riskLevel, checks, completedAt } = payload

  console.log("[credas-webhook]", event, inviteId, referenceId, status)

  const adminClient = createAdminClient()

  // ── Find enquiry ─────────────────────────────────────────────────
  const { data: enquiry, error: enquiryError } = await adminClient
    .from("enquiries")
    .select("*")
    .eq("id", referenceId)
    .single()

  if (enquiryError || !enquiry) {
    // Try lookup by invite ID stored in onboarding_data as fallback
    console.error("[credas-webhook] Enquiry not found by referenceId:", referenceId)
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  }

  const onboardingData = enquiry.onboarding_data || {}
  const now = completedAt || new Date().toISOString()

  // ── Determine check type from which invite ID matches ────────────
  const isAml = onboardingData.credas_aml_invite_id === inviteId
  const isSof = onboardingData.credas_sof_invite_id === inviteId
  const checkType = isAml ? "aml" : isSof ? "source_of_funds" : "unknown"

  const passed  = status === "complete"
  const failed  = status === "failed" || status === "expired"

  // ── Build updated onboarding_data ────────────────────────────────
  let updatedData = { ...onboardingData }
  let activityAction: string
  let activityDescription: string

  switch (event) {
    case "invite.completed": {
      if (isAml) {
        updatedData = {
          ...updatedData,
          id_verification: {
            ...updatedData.id_verification,
            started:      true,
            completed:    true,
            completed_at: now,
            provider:     "credas",
            status:       passed ? "approved" : "failed",
            risk_level:   riskLevel,
            aml_passed:   checks?.aml?.passed ?? false,
            pep_match:    checks?.aml?.pepMatch ?? false,
            sanctions_match: checks?.aml?.sanctionsMatch ?? false,
          },
        }
        activityAction      = "aml_check_completed"
        activityDescription = `Credas AML check ${status}${riskLevel ? ` — ${riskLevel} risk` : ""}${checks?.aml?.pepMatch ? " — PEP MATCH" : ""}${checks?.aml?.sanctionsMatch ? " — SANCTIONS MATCH" : ""}`
      } else if (isSof) {
        updatedData = {
          ...updatedData,
          source_of_funds: {
            ...updatedData.source_of_funds,
            started:      true,
            completed:    true,
            completed_at: now,
            provider:     "credas",
            status:       passed ? "approved" : "failed",
            risk_level:   riskLevel,
            sof_passed:   checks?.sof?.passed ?? false,
          },
        }
        activityAction      = "sof_check_completed"
        activityDescription = `Credas source of funds check ${status}${riskLevel ? ` — ${riskLevel} risk` : ""}`
      } else {
        // Unknown invite ID — still log it
        activityAction      = "credas_check_completed"
        activityDescription = `Credas check completed (invite ${inviteId}) — status: ${status}`
      }
      break
    }

    case "invite.failed":
    case "invite.expired": {
      // Mark the relevant step as failed so the UI can prompt retry
      if (isAml) {
        updatedData = {
          ...updatedData,
          id_verification: {
            ...updatedData.id_verification,
            completed:  false,
            status:     event === "invite.expired" ? "expired" : "failed",
            provider:   "credas",
          },
        }
      } else if (isSof) {
        updatedData = {
          ...updatedData,
          source_of_funds: {
            ...updatedData.source_of_funds,
            completed:  false,
            status:     event === "invite.expired" ? "expired" : "failed",
            provider:   "credas",
          },
        }
      }
      activityAction      = "credas_check_failed"
      activityDescription = `Credas invite ${event.replace("invite.", "")} — invite ID: ${inviteId}`
      break
    }

    case "check.updated": {
      // Intermediate progress update — just log it
      activityAction      = "credas_check_updated"
      activityDescription = `Credas check update received — ${checkType} — status: ${status}`
      break
    }

    default: {
      activityAction      = "credas_event_received"
      activityDescription = `Credas unknown event: ${event}`
    }
  }

  // ── Persist updated onboarding_data ──────────────────────────────
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

  // ── Check if all required steps are now complete ──────────────────
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
      enquiryId:   enquiry.id,
      actorType:   "webhook",
      action:      "onboarding_compliance_complete",
      description: "All Credas checks passed — onboarding marked compliance complete",
    })
  }

  // ── Activity log ─────────────────────────────────────────────────
  await logActivity({
    enquiryId:   enquiry.id,
    actorType:   "webhook",
    action:      activityAction,
    description: activityDescription,
  })

  // Always return 200 to Credas so they don't retry
  return NextResponse.json({ received: true })
}

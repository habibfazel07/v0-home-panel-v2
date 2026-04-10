/**
 * POST /api/onboarding/credas
 *
 * Initiates a Credas AML or Source of Funds check for a client.
 * Called from the client onboarding page when the user starts
 * identity verification or source of funds verification.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, logActivity } from "@/lib/database"
import { sendCredasInvite, isCredasConfigured } from "@/lib/credas"

/**
 * GET /api/onboarding/credas?token=xxx
 * Returns the current Credas invite status for an enquiry.
 * Redirects to the status endpoint for actual status checking.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  
  if (!token) {
    return NextResponse.json(
      { error: "Token required. Use GET /api/onboarding/credas/status for status polling." },
      { status: 400 }
    )
  }
  
  // Redirect to the proper status endpoint
  return NextResponse.json(
    { 
      error: "Use POST to create an invite, or GET /api/onboarding/credas/status?token=xxx&checkType=aml for status",
      hint: "This endpoint only accepts POST requests to create Credas invites"
    },
    { status: 405 }
  )
}

export async function POST(request: Request) {
  try {
    console.log("[credas] POST request received")
    
    const body = await request.json()
    const { token, checkType } = body
    
    console.log("[credas] Request body:", { token: token ? "present" : "missing", checkType })

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    if (!checkType || !["aml", "source_of_funds"].includes(checkType)) {
      return NextResponse.json({ error: "Invalid check type. Must be 'aml' or 'source_of_funds'" }, { status: 400 })
    }

    console.log("[credas] Creating admin client...")
    const adminClient = createAdminClient()

    // Verify token and get enquiry
    console.log("[credas] Looking up enquiry by token...")
    const { data: enquiry, error: enquiryError } = await adminClient
      .from("enquiries")
      .select("*")
      .eq("onboarding_token", token)
      .single()

    if (enquiryError) {
      console.error("[credas] Enquiry lookup error:", enquiryError)
      return NextResponse.json({ error: "Invalid token", details: enquiryError.message }, { status: 404 })
    }
    
    if (!enquiry) {
      console.error("[credas] No enquiry found for token")
      return NextResponse.json({ error: "Invalid token" }, { status: 404 })
    }
    
    console.log("[credas] Found enquiry:", enquiry.id)

    // Get onboarding data
    const onboardingData = enquiry.onboarding_data || {}

    // Check if we already have a Credas invite for this check type
    const existingInviteKey = checkType === "aml" ? "credas_aml_invite_id" : "credas_sof_invite_id"
    const existingUrlKey = checkType === "aml" ? "credas_aml_invite_url" : "credas_sof_invite_url"
    
    if (onboardingData[existingInviteKey] && onboardingData[existingUrlKey]) {
      // Return existing invite URL
      return NextResponse.json({
        success: true,
        inviteId: onboardingData[existingInviteKey],
        inviteUrl: onboardingData[existingUrlKey],
        existing: true,
      })
    }

    // Build webhook URL for Credas to call back
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || "https://v0-home-panel-v2.vercel.app"
    
    const webhookUrl = `${baseUrl}/api/webhooks/credas`
    const redirectUrl = `${baseUrl}/onboarding/${token}?step=${checkType === "aml" ? "id-verification" : "source-of-funds"}&completed=true`

    // Send Credas invite
    console.log("[credas] Sending invite to Credas API...", {
      firstName: enquiry.first_name,
      lastName: enquiry.last_name,
      email: enquiry.email,
      checkType,
      webhookUrl,
      redirectUrl,
    })
    
    const inviteResponse = await sendCredasInvite({
      firstName: enquiry.first_name,
      lastName: enquiry.last_name,
      email: enquiry.email,
      phone: enquiry.phone,
      checkType: checkType as "aml" | "source_of_funds",
      referenceId: enquiry.id,
      webhookUrl,
      redirectUrl,
    })
    
    console.log("[credas] Invite response:", inviteResponse)

    if (!inviteResponse.success) {
      console.error("[credas] Failed to create invite:", inviteResponse.error)
      return NextResponse.json(
        { error: inviteResponse.error || "Failed to create Credas invite" },
        { status: 500 }
      )
    }

    // Store invite ID in onboarding data
    console.log("[credas] Storing invite in database...")
    const updatedOnboardingData = {
      ...onboardingData,
      [existingInviteKey]: inviteResponse.inviteId,
      [existingUrlKey]: inviteResponse.inviteUrl,
    }

    const { error: updateError } = await adminClient
      .from("enquiries")
      .update({
        onboarding_data: updatedOnboardingData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id)
      
    if (updateError) {
      console.error("[credas] Failed to update enquiry:", updateError)
      // Continue anyway - the invite was created, we just couldn't store it
    } else {
      console.log("[credas] Enquiry updated successfully")
    }

    // Log activity
    try {
      await logActivity({
        enquiryId: enquiry.id,
        actorType: "client",
        action: "aml_check_initiated",
        description: `Credas ${checkType === "aml" ? "AML/ID verification" : "source of funds"} check initiated`,
        metadata: {
          provider: "credas",
          inviteId: inviteResponse.inviteId,
          checkType,
        },
      })
      console.log("[credas] Activity logged")
    } catch (activityError) {
      console.error("[credas] Failed to log activity:", activityError)
      // Continue anyway - not critical
    }

    return NextResponse.json({
      success: true,
      inviteId: inviteResponse.inviteId,
      inviteUrl: inviteResponse.inviteUrl,
    })
  } catch (error) {
    console.error("[credas] API error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("[credas] Error stack:", errorStack)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: errorMessage 
    }, { status: 500 })
  }
}

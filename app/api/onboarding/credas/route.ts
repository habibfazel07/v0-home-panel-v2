/**
 * POST /api/onboarding/credas
 *
 * Initiates a Credas AML or Source of Funds check for a client.
 * Called from the client onboarding page when the user starts
 * identity verification or source of funds verification.
 */

import { NextResponse } from "next/server"
import { createAdminClient, logActivity } from "@/lib/database"
import { sendCredasInvite, isCredasConfigured } from "@/lib/credas"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, checkType } = body

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    if (!checkType || !["aml", "source_of_funds"].includes(checkType)) {
      return NextResponse.json({ error: "Invalid check type. Must be 'aml' or 'source_of_funds'" }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Verify token and get enquiry
    const { data: enquiry, error: enquiryError } = await adminClient
      .from("enquiries")
      .select("*")
      .eq("onboarding_token", token)
      .single()

    if (enquiryError || !enquiry) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 })
    }

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

    if (!inviteResponse.success) {
      console.error("[credas] Failed to create invite:", inviteResponse.error)
      return NextResponse.json(
        { error: inviteResponse.error || "Failed to create Credas invite" },
        { status: 500 }
      )
    }

    // Store invite ID in onboarding data
    const updatedOnboardingData = {
      ...onboardingData,
      [existingInviteKey]: inviteResponse.inviteId,
      [existingUrlKey]: inviteResponse.inviteUrl,
    }

    await adminClient
      .from("enquiries")
      .update({
        onboarding_data: updatedOnboardingData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id)

    // Log activity
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

    return NextResponse.json({
      success: true,
      inviteId: inviteResponse.inviteId,
      inviteUrl: inviteResponse.inviteUrl,
    })
  } catch (error) {
    console.error("[credas] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

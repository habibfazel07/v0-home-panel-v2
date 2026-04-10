/**
 * GET /api/onboarding/credas/status?token=xxx&checkType=aml|source_of_funds
 *
 * Polls Credas API for the current status of an invite and also returns
 * the locally stored status from onboarding_data. This allows the
 * onboarding UI to update in real-time when the client completes
 * their Credas journey.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/database"
import { getCredasStatus, isCredasConfigured } from "@/lib/credas"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")
  const checkType = searchParams.get("checkType") as "aml" | "source_of_funds" | null

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  if (!checkType || !["aml", "source_of_funds"].includes(checkType)) {
    return NextResponse.json({ error: "Invalid checkType" }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Find enquiry by onboarding token
  const { data: enquiry, error: enquiryError } = await adminClient
    .from("enquiries")
    .select("id, onboarding_data")
    .eq("onboarding_token", token)
    .single()

  if (enquiryError || !enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  }

  const onboardingData = enquiry.onboarding_data || {}

  // Determine which invite ID to check
  const inviteId = checkType === "aml"
    ? onboardingData.credas_aml_invite_id
    : onboardingData.credas_sof_invite_id

  // Get locally stored status
  const localStatus = checkType === "aml"
    ? onboardingData.id_verification
    : onboardingData.source_of_funds

  // If no invite exists yet, return early
  if (!inviteId) {
    return NextResponse.json({
      status: "not_started",
      localStatus: null,
      inviteId: null,
    })
  }

  // If already completed locally (webhook received), return that
  if (localStatus?.completed) {
    return NextResponse.json({
      status: "complete",
      localStatus: {
        completed: true,
        completed_at: localStatus.completed_at,
        status: localStatus.status,
        risk_level: localStatus.risk_level,
        aml_passed: localStatus.aml_passed,
        pep_match: localStatus.pep_match,
        sanctions_match: localStatus.sanctions_match,
        sof_passed: localStatus.sof_passed,
        identity_verified: localStatus.identity_verified,
        address_verified: localStatus.address_verified,
      },
      inviteId,
    })
  }

  // Poll Credas API for real-time status
  if (isCredasConfigured()) {
    const credasStatus = await getCredasStatus(inviteId)

    if (credasStatus.success && credasStatus.status === "complete") {
      // Credas says complete but webhook hasn't fired yet — update locally
      const now = new Date().toISOString()
      const updatedData = { ...onboardingData }

      if (checkType === "aml") {
        updatedData.id_verification = {
          ...updatedData.id_verification,
          started: true,
          completed: true,
          completed_at: credasStatus.completedAt || now,
          provider: "credas",
          status: "approved",
          risk_level: credasStatus.riskLevel,
        }
      } else {
        updatedData.source_of_funds = {
          ...updatedData.source_of_funds,
          started: true,
          completed: true,
          completed_at: credasStatus.completedAt || now,
          provider: "credas",
          status: "approved",
          risk_level: credasStatus.riskLevel,
        }
      }

      // Update enquiry with new status
      await adminClient
        .from("enquiries")
        .update({
          onboarding_data: updatedData,
          updated_at: now,
        })
        .eq("id", enquiry.id)

      return NextResponse.json({
        status: "complete",
        localStatus: checkType === "aml"
          ? updatedData.id_verification
          : updatedData.source_of_funds,
        inviteId,
        source: "polling",
      })
    }

    return NextResponse.json({
      status: credasStatus.status || "pending",
      localStatus: localStatus || { started: true, completed: false },
      inviteId,
      credasStatus: {
        identityStatus: credasStatus.identityStatus,
        amlStatus: credasStatus.amlStatus,
        sofStatus: credasStatus.sofStatus,
        riskLevel: credasStatus.riskLevel,
      },
    })
  }

  // If Credas not configured, return local status
  return NextResponse.json({
    status: localStatus?.started ? "pending" : "not_started",
    localStatus: localStatus || null,
    inviteId,
    demo: true,
  })
}

/**
 * HomePanel v2 - Compliance Service Layer
 * Provider-agnostic compliance operations
 * Abstracts Credas, Yoti, Onfido, and manual review workflows
 */

import { createAdminClient, logActivity, logAudit } from "@/lib/database"
import {
  AmlReview,
  AmlStatus,
  RiskLevel,
  ComplianceProvider,
  CheckType,
  CreateComplianceCaseRequest,
  ComplianceProviderResponse,
  IdVerificationRequest,
  SourceOfFundsRequest,
  ManualReviewRequest,
  ComplianceSummary,
  PROVIDERS,
  CHECK_TYPES,
} from "./types"

/**
 * Create or get AML review for an enquiry/case
 */
export async function getOrCreateAmlReview(
  enquiryId?: string,
  caseId?: string
): Promise<AmlReview | null> {
  if (!enquiryId && !caseId) {
    throw new Error("Either enquiryId or caseId must be provided")
  }

  const adminClient = createAdminClient()

  // Check for existing review
  let query = adminClient.from("aml_reviews").select("*")
  if (enquiryId) query = query.eq("enquiry_id", enquiryId)
  if (caseId) query = query.eq("case_id", caseId)

  const { data: existing, error: fetchError } = await query.maybeSingle()

  if (fetchError) {
    console.error("[compliance] Failed to fetch AML review:", fetchError)
    return null
  }

  if (existing) {
    return existing as AmlReview
  }

  // Create new review
  const { data: newReview, error: createError } = await adminClient
    .from("aml_reviews")
    .insert({
      enquiry_id: enquiryId,
      case_id: caseId,
      status: "not_started",
      risk_level: "low",
      source_of_funds_status: "not_started",
      id_verification_status: "not_started",
      pep_sanctions_status: "not_started",
      address_verification_status: "not_started",
    })
    .select()
    .single()

  if (createError) {
    console.error("[compliance] Failed to create AML review:", createError)
    return null
  }

  // Log activity
  await logActivity({
    enquiryId,
    caseId,
    actorType: "system",
    action: "aml_check_initiated",
    description: "AML review initiated",
    metadata: { reviewId: newReview.id },
  })

  return newReview as AmlReview
}

/**
 * Update AML review status
 */
export async function updateAmlReviewStatus(
  reviewId: string,
  updates: Partial<AmlReview>,
  actorId?: string
): Promise<AmlReview | null> {
  const adminClient = createAdminClient()

  // Fetch current state for audit
  const { data: currentReview } = await adminClient
    .from("aml_reviews")
    .select("*")
    .eq("id", reviewId)
    .single()

  const { data: updatedReview, error } = await adminClient
    .from("aml_reviews")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reviewId)
    .select()
    .single()

  if (error) {
    console.error("[compliance] Failed to update AML review:", error)
    return null
  }

  // Log audit trail
  await logAudit({
    actorId,
    actorType: actorId ? "user" : "system",
    action: "aml_review_updated",
    resourceType: "aml_review",
    resourceId: reviewId,
    previousState: currentReview,
    newState: updatedReview,
    metadata: { changes: updates },
  })

  return updatedReview as AmlReview
}

/**
 * Create compliance case with external provider
 * Abstracted to support multiple providers
 */
export async function createComplianceCase(
  request: CreateComplianceCaseRequest
): Promise<ComplianceProviderResponse> {
  const provider = request.provider || PROVIDERS.CREDAS

  // Get or create AML review
  const review = await getOrCreateAmlReview(request.enquiryId, request.caseId)
  if (!review) {
    return {
      success: false,
      provider,
      reference: "",
      status: "failed",
      error: { code: "REVIEW_CREATION_FAILED", message: "Failed to create AML review" },
    }
  }

  // Route to appropriate provider
  switch (provider) {
    case PROVIDERS.CREDAS:
      return await createCredasCase(review.id, request)
    case PROVIDERS.YOTI:
      return await createYotiCase(review.id, request)
    case PROVIDERS.ONFIDO:
      return await createOnfidoCase(review.id, request)
    default:
      return {
        success: false,
        provider,
        reference: "",
        status: "failed",
        error: { code: "UNKNOWN_PROVIDER", message: `Unknown provider: ${provider}` },
      }
  }
}

/**
 * Request source of funds check
 */
export async function requestSourceOfFunds(
  request: SourceOfFundsRequest
): Promise<ComplianceProviderResponse> {
  const provider = request.provider || PROVIDERS.CREDAS

  // Update review status to pending
  await updateAmlReviewStatus(request.reviewId, {
    source_of_funds_status: "pending",
    provider,
  })

  // Log activity
  await logActivity({
    actorType: "system",
    action: "aml_check_initiated",
    description: "Source of funds check requested",
    metadata: {
      reviewId: request.reviewId,
      provider,
      checkType: CHECK_TYPES.SOURCE_OF_FUNDS,
    },
  })

  // In production, this would call the actual provider API
  // For now, return a pending response
  return {
    success: true,
    provider,
    reference: `SOF-${Date.now()}`,
    status: "pending",
    checks: [
      {
        type: CHECK_TYPES.SOURCE_OF_FUNDS,
        status: "pending",
      },
    ],
  }
}

/**
 * Request ID verification check
 */
export async function requestIdVerification(
  request: IdVerificationRequest
): Promise<ComplianceProviderResponse> {
  const provider = request.provider || PROVIDERS.CREDAS

  // Update review status to pending
  await updateAmlReviewStatus(request.reviewId, {
    id_verification_status: "pending",
    provider,
  })

  // Log activity
  await logActivity({
    actorType: "system",
    action: "aml_check_initiated",
    description: "ID verification check requested",
    metadata: {
      reviewId: request.reviewId,
      provider,
      checkType: CHECK_TYPES.ID_VERIFICATION,
      documentType: request.documentType,
    },
  })

  // In production, this would call the actual provider API
  return {
    success: true,
    provider,
    reference: `IDV-${Date.now()}`,
    status: "pending",
    checks: [
      {
        type: CHECK_TYPES.ID_VERIFICATION,
        status: "pending",
      },
    ],
  }
}

/**
 * Submit manual review decision
 */
export async function submitManualReview(
  request: ManualReviewRequest
): Promise<ComplianceProviderResponse> {
  const statusMap: Record<string, AmlStatus> = {
    approved: "approved",
    flagged: "flagged",
    failed: "failed",
  }

  const newStatus = statusMap[request.status] || "manual_review_required"

  // Build update based on check type
  const updates: Partial<AmlReview> = {
    reviewed_by: request.reviewedBy,
    reviewed_at: new Date().toISOString(),
    review_notes: request.notes,
    provider: PROVIDERS.MANUAL,
  }

  switch (request.checkType) {
    case CHECK_TYPES.ID_VERIFICATION:
      updates.id_verification_status = newStatus
      break
    case CHECK_TYPES.SOURCE_OF_FUNDS:
      updates.source_of_funds_status = newStatus
      break
    case CHECK_TYPES.PEP_SANCTIONS:
      updates.pep_sanctions_status = newStatus
      break
    case CHECK_TYPES.ADDRESS_VERIFICATION:
      updates.address_verification_status = newStatus
      break
  }

  // Add risk assessment if provided
  if (request.riskLevel) {
    updates.risk_level = request.riskLevel
  }
  if (request.riskFactors) {
    updates.risk_factors = request.riskFactors
  }

  // Update review
  const review = await updateAmlReviewStatus(
    request.reviewId,
    updates,
    request.reviewedBy
  )

  if (!review) {
    return {
      success: false,
      provider: PROVIDERS.MANUAL,
      reference: request.reviewId,
      status: "failed",
      error: { code: "UPDATE_FAILED", message: "Failed to update review" },
    }
  }

  // Log activity
  await logActivity({
    actorType: "admin",
    actorId: request.reviewedBy,
    action: "aml_review_submitted",
    description: `Manual review submitted: ${request.status}`,
    metadata: {
      reviewId: request.reviewId,
      checkType: request.checkType,
      status: request.status,
      riskLevel: request.riskLevel,
    },
  })

  // Check if all checks are complete and update overall status
  await recalculateOverallStatus(request.reviewId)

  return {
    success: true,
    provider: PROVIDERS.MANUAL,
    reference: request.reviewId,
    status: newStatus,
    riskLevel: request.riskLevel,
    riskFactors: request.riskFactors,
  }
}

/**
 * Recalculate overall AML status based on individual checks
 */
async function recalculateOverallStatus(reviewId: string): Promise<void> {
  const adminClient = createAdminClient()

  const { data: review } = await adminClient
    .from("aml_reviews")
    .select("*")
    .eq("id", reviewId)
    .single()

  if (!review) return

  const statuses = [
    review.id_verification_status,
    review.source_of_funds_status,
    review.pep_sanctions_status,
  ]

  let overallStatus: AmlStatus = "not_started"
  let riskLevel: RiskLevel = "low"

  // Check for failures or flags first
  if (statuses.includes("failed")) {
    overallStatus = "failed"
    riskLevel = "very_high"
  } else if (statuses.includes("flagged")) {
    overallStatus = "flagged"
    riskLevel = "high"
  } else if (statuses.includes("manual_review_required")) {
    overallStatus = "manual_review_required"
    riskLevel = "medium"
  } else if (statuses.every((s) => s === "approved")) {
    overallStatus = "approved"
    riskLevel = review.risk_level || "low"
  } else if (statuses.some((s) => s === "pending" || s === "in_review")) {
    overallStatus = "in_review"
  }

  await adminClient
    .from("aml_reviews")
    .update({
      status: overallStatus,
      risk_level: riskLevel,
      completed_at: overallStatus === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", reviewId)
}

/**
 * Get compliance summary for display
 */
export async function getComplianceSummary(
  enquiryId?: string,
  caseId?: string
): Promise<ComplianceSummary | null> {
  const review = await getOrCreateAmlReview(enquiryId, caseId)
  if (!review) return null

  const adminClient = createAdminClient()

  // Get document counts
  let docQuery = adminClient.from("documents").select("status")
  if (enquiryId) docQuery = docQuery.eq("enquiry_id", enquiryId)
  if (caseId) docQuery = docQuery.eq("case_id", caseId)

  const { data: documents } = await docQuery

  const docCounts = {
    total: documents?.length || 0,
    approved: documents?.filter((d) => d.status === "approved").length || 0,
    pending: documents?.filter((d) => d.status === "pending" || d.status === "pending_review").length || 0,
    rejected: documents?.filter((d) => d.status === "rejected").length || 0,
  }

  // Calculate readiness
  let readiness: ComplianceSummary["readiness"] = "not_ready"
  if (review.status === "approved" && docCounts.pending === 0 && docCounts.rejected === 0) {
    readiness = "ready"
  } else if (review.status === "failed" || review.status === "flagged") {
    readiness = "blocked"
  } else if (review.status === "manual_review_required") {
    readiness = "manual_review_required"
  } else if (review.status === "pending" || review.status === "in_review") {
    readiness = "pending_checks"
  }

  return {
    overall: {
      status: review.status,
      riskLevel: review.risk_level,
      riskScore: review.risk_score,
      completedAt: review.completed_at,
    },
    checks: {
      idVerification: {
        type: CHECK_TYPES.ID_VERIFICATION,
        status: review.id_verification_status,
        provider: review.provider,
        completedAt: review.id_verification_status === "approved" ? review.updated_at : undefined,
      },
      sourceOfFunds: {
        type: CHECK_TYPES.SOURCE_OF_FUNDS,
        status: review.source_of_funds_status,
        provider: review.provider,
        completedAt: review.source_of_funds_status === "approved" ? review.updated_at : undefined,
      },
      pepSanctions: {
        type: CHECK_TYPES.PEP_SANCTIONS,
        status: review.pep_sanctions_status,
        provider: review.provider,
        completedAt: review.pep_sanctions_status === "approved" ? review.updated_at : undefined,
      },
      addressVerification: {
        type: CHECK_TYPES.ADDRESS_VERIFICATION,
        status: review.address_verification_status,
        provider: review.provider,
        completedAt: review.address_verification_status === "approved" ? review.updated_at : undefined,
      },
    },
    documents: docCounts,
    riskFactors: review.risk_factors || [],
    readiness,
  }
}

// ============================================================================
// Provider-specific implementations (stubs for now)
// These would contain actual API calls in production
// ============================================================================

async function createCredasCase(
  reviewId: string,
  request: CreateComplianceCaseRequest
): Promise<ComplianceProviderResponse> {
  // Credas API integration is handled via /api/onboarding/credas route
  // This function updates the internal review status
  
  await updateAmlReviewStatus(reviewId, {
    provider: PROVIDERS.CREDAS,
    provider_reference: `CREDAS-${Date.now()}`,
    status: "pending",
  })

  return {
    success: true,
    provider: PROVIDERS.CREDAS,
    reference: `CREDAS-${Date.now()}`,
    status: "pending",
  }
}

async function createYotiCase(
  reviewId: string,
  request: CreateComplianceCaseRequest
): Promise<ComplianceProviderResponse> {
  // TODO: Implement actual Yoti API integration
  
  await updateAmlReviewStatus(reviewId, {
    provider: PROVIDERS.YOTI,
    provider_reference: `YOTI-${Date.now()}`,
    status: "pending",
  })

  return {
    success: true,
    provider: PROVIDERS.YOTI,
    reference: `YOTI-${Date.now()}`,
    status: "pending",
  }
}

async function createOnfidoCase(
  reviewId: string,
  request: CreateComplianceCaseRequest
): Promise<ComplianceProviderResponse> {
  // TODO: Implement actual Onfido API integration
  
  await updateAmlReviewStatus(reviewId, {
    provider: PROVIDERS.ONFIDO,
    provider_reference: `ONF-${Date.now()}`,
    status: "pending",
  })

  return {
    success: true,
    provider: PROVIDERS.ONFIDO,
    reference: `ONF-${Date.now()}`,
    status: "pending",
  }
}

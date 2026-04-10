/**
 * HomePanel v2 - Compliance Types
 * Type definitions for AML, KYC, and compliance workflows
 * Provider-agnostic abstractions for Credas, Yoti, Onfido, etc.
 */

// AML Status values
export const AML_STATUSES = [
  "not_started",
  "pending",
  "in_review",
  "approved",
  "flagged",
  "failed",
  "manual_review_required",
] as const

export type AmlStatus = (typeof AML_STATUSES)[number]

// Risk levels
export const RISK_LEVELS = ["low", "medium", "high", "very_high"] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

// Compliance providers
export const PROVIDERS = {
  CREDAS: "credas",
  YOTI: "yoti",
  ONFIDO: "onfido",
  MANUAL: "manual",
} as const

export type ComplianceProvider = (typeof PROVIDERS)[keyof typeof PROVIDERS]

// Check types
export const CHECK_TYPES = {
  ID_VERIFICATION: "id_verification",
  SOURCE_OF_FUNDS: "source_of_funds",
  PEP_SANCTIONS: "pep_sanctions",
  ADDRESS_VERIFICATION: "address_verification",
} as const

export type CheckType = (typeof CHECK_TYPES)[keyof typeof CHECK_TYPES]

/**
 * AML Review record from database
 */
export interface AmlReview {
  id: string
  enquiry_id?: string
  case_id?: string
  
  // Overall status
  status: AmlStatus
  risk_level: RiskLevel
  
  // Individual check statuses
  source_of_funds_status: AmlStatus
  id_verification_status: AmlStatus
  pep_sanctions_status: AmlStatus
  address_verification_status: AmlStatus
  
  // Provider information
  provider?: ComplianceProvider
  provider_reference?: string
  provider_payload?: Record<string, unknown>
  
  // Review tracking
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  
  // Risk assessment
  risk_factors?: RiskFactor[]
  risk_score?: number
  
  // Timestamps
  created_at: string
  updated_at: string
  completed_at?: string
}

/**
 * Risk factor identified during AML review
 */
export interface RiskFactor {
  type: string
  description: string
  severity: RiskLevel
  source: string
  detected_at: string
}

/**
 * Request to create compliance case with provider
 */
export interface CreateComplianceCaseRequest {
  enquiryId?: string
  caseId?: string
  
  // Client information
  client: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    dateOfBirth?: string
    nationalInsuranceNumber?: string
  }
  
  // Address information
  address?: {
    line1: string
    line2?: string
    city: string
    postcode: string
    country?: string
  }
  
  // Transaction details
  transaction?: {
    type: string
    propertyValue?: number
    propertyAddress?: string
  }
  
  // Provider preferences
  provider?: ComplianceProvider
  checkTypes?: CheckType[]
}

/**
 * Response from compliance provider
 */
export interface ComplianceProviderResponse {
  success: boolean
  provider: ComplianceProvider
  reference: string
  status: AmlStatus
  
  // Check results
  checks?: {
    type: CheckType
    status: AmlStatus
    result?: Record<string, unknown>
    completedAt?: string
  }[]
  
  // Risk assessment
  riskLevel?: RiskLevel
  riskScore?: number
  riskFactors?: RiskFactor[]
  
  // Raw provider response
  rawPayload?: Record<string, unknown>
  
  // Error information
  error?: {
    code: string
    message: string
  }
}

/**
 * ID verification request
 */
export interface IdVerificationRequest {
  reviewId: string
  
  // Document details
  documentType: "passport" | "driving_licence" | "national_id"
  documentNumber?: string
  
  // Client details for matching
  firstName: string
  lastName: string
  dateOfBirth?: string
  
  // Document images (base64 or URLs)
  frontImage?: string
  backImage?: string
  selfieImage?: string
  
  // Provider preferences
  provider?: ComplianceProvider
}

/**
 * Source of funds request
 */
export interface SourceOfFundsRequest {
  reviewId: string
  
  // Client details
  email: string
  firstName: string
  lastName: string
  
  // Transaction details
  expectedAmount?: number
  fundsSources?: string[]
  
  // Provider preferences
  provider?: ComplianceProvider
}

/**
 * PEP and Sanctions screening request
 */
export interface PepSanctionsRequest {
  reviewId: string
  
  // Client details
  firstName: string
  lastName: string
  dateOfBirth?: string
  nationality?: string
  
  // Provider preferences
  provider?: ComplianceProvider
}

/**
 * Manual review submission
 */
export interface ManualReviewRequest {
  reviewId: string
  checkType: CheckType
  
  // Review decision
  status: "approved" | "flagged" | "failed"
  
  // Review details
  reviewedBy: string
  notes?: string
  
  // Evidence
  evidenceDocumentIds?: string[]
  
  // Risk assessment
  riskLevel?: RiskLevel
  riskFactors?: RiskFactor[]
}

/**
 * Compliance check result for display
 */
export interface ComplianceCheckResult {
  type: CheckType
  status: AmlStatus
  provider?: ComplianceProvider
  completedAt?: string
  reviewedBy?: string
  notes?: string
  
  // Risk information
  riskLevel?: RiskLevel
  riskFactors?: RiskFactor[]
  
  // Provider-specific details
  details?: Record<string, unknown>
}

/**
 * Overall compliance summary
 */
export interface ComplianceSummary {
  overall: {
    status: AmlStatus
    riskLevel: RiskLevel
    riskScore?: number
    completedAt?: string
  }
  
  checks: {
    idVerification: ComplianceCheckResult
    sourceOfFunds: ComplianceCheckResult
    pepSanctions: ComplianceCheckResult
    addressVerification: ComplianceCheckResult
  }
  
  documents: {
    total: number
    approved: number
    pending: number
    rejected: number
  }
  
  riskFactors: RiskFactor[]
  
  readiness: "not_ready" | "pending_checks" | "manual_review_required" | "ready" | "blocked"
}

/**
 * Status display helpers
 */
export function getAmlStatusLabel(status: AmlStatus): string {
  const labels: Record<AmlStatus, string> = {
    not_started: "Not Started",
    pending: "Pending",
    in_review: "In Review",
    approved: "Approved",
    flagged: "Flagged",
    failed: "Failed",
    manual_review_required: "Manual Review Required",
  }
  return labels[status] || status
}

export function getAmlStatusStyle(status: AmlStatus): string {
  const styles: Record<AmlStatus, string> = {
    not_started: "bg-muted text-muted-foreground",
    pending: "bg-amber-50 text-amber-700",
    in_review: "bg-blue-50 text-blue-700",
    approved: "bg-emerald-50 text-emerald-700",
    flagged: "bg-orange-50 text-orange-700",
    failed: "bg-red-50 text-red-700",
    manual_review_required: "bg-purple-50 text-purple-700",
  }
  return styles[status] || "bg-muted text-muted-foreground"
}

export function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
    very_high: "Very High Risk",
  }
  return labels[level] || level
}

export function getRiskLevelStyle(level: RiskLevel): string {
  const styles: Record<RiskLevel, string> = {
    low: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    high: "bg-orange-50 text-orange-700",
    very_high: "bg-red-50 text-red-700",
  }
  return styles[level] || "bg-muted text-muted-foreground"
}

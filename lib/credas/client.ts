/**
 * HomePanel — Credas API Client
 *
 * Credas handles:
 *   - Identity verification  (ID document + selfie)
 *   - AML checks             (PEPs / sanctions screening)
 *   - Address verification
 *   - Source of funds        (open banking + document upload)
 *
 * Sandbox base URL : https://portal.credasdemo.com/api/
 * Live base URL    : https://portal.credas.com/api/        (set via env)
 *
 * Docs  : https://portal.credasdemo.com/api/swagger
 * Support : support@credas.com
 */

const CREDAS_BASE_URL = process.env.CREDAS_BASE_URL || "https://portal.credasdemo.com/api"
const CREDAS_API_KEY  = process.env.CREDAS_API_KEY

// Journey IDs — retrieved from GET /v2/ci/journeys
// Defaults here are the sandbox values supplied by Credas.
const CREDAS_AML_JOURNEY_ID = process.env.CREDAS_AML_JOURNEY_ID || "5266c860-f7ec-455b-be7d-7399fc8e11a6"
const CREDAS_AML_ACTOR_ID   = parseInt(process.env.CREDAS_AML_ACTOR_ID || "17", 10)
const CREDAS_SOF_JOURNEY_ID = process.env.CREDAS_SOF_JOURNEY_ID || "" // populate once retrieved
const CREDAS_SOF_ACTOR_ID   = parseInt(process.env.CREDAS_SOF_ACTOR_ID || "0", 10)

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type CredasCheckType = "aml" | "source_of_funds"

export interface CredasInviteRequest {
  firstName: string
  lastName: string
  email: string
  phone?: string
  checkType: CredasCheckType
  referenceId: string   // our internal enquiry / case ID
  redirectUrl?: string  // where Credas sends the user after completion
  webhookUrl?: string   // where Credas POSTs results
}

export interface CredasInviteResponse {
  success: boolean
  inviteId?: string     // Credas case / invite ID
  inviteUrl?: string    // white-labelled URL to send the customer to
  error?: string
}

export interface CredasStatusResponse {
  success: boolean
  status?: "pending" | "in_progress" | "complete" | "failed" | "expired"
  identityStatus?: string
  amlStatus?: string
  sofStatus?: string
  riskLevel?: "low" | "medium" | "high"
  completedAt?: string
  error?: string
}

export interface CredasWebhookPayload {
  event: "invite.completed" | "invite.failed" | "invite.expired" | "check.updated"
  inviteId: string
  referenceId: string
  journeyId: string
  status: "complete" | "failed" | "expired"
  riskLevel?: "low" | "medium" | "high"
  checks?: {
    identity?: { status: string; passed: boolean }
    aml?:      { status: string; passed: boolean; pepMatch: boolean; sanctionsMatch: boolean }
    address?:  { status: string; passed: boolean }
    sof?:      { status: string; passed: boolean }
  }
  completedAt?: string
  metadata?: Record<string, unknown>
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function headers(): Record<string, string> {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${CREDAS_API_KEY}`,
    "Accept":        "application/json",
  }
}

export function isCredasConfigured(): boolean {
  return Boolean(CREDAS_API_KEY)
}

// ─────────────────────────────────────────────
// Send a Credas invite to a client
// ─────────────────────────────────────────────

export async function sendCredasInvite(
  request: CredasInviteRequest
): Promise<CredasInviteResponse> {

  if (!CREDAS_API_KEY) {
    console.warn("[credas] API key not configured — returning sandbox demo invite")
    return buildDemoInvite(request)
  }

  const isAml = request.checkType === "aml"
  const journeyId = isAml ? CREDAS_AML_JOURNEY_ID : CREDAS_SOF_JOURNEY_ID
  const actorId   = isAml ? CREDAS_AML_ACTOR_ID   : CREDAS_SOF_ACTOR_ID

  if (!journeyId) {
    return { success: false, error: `Journey ID not configured for check type: ${request.checkType}` }
  }

  try {
    /**
     * POST /v2/ci/invites
     * Sends a white-labelled Credas invite to the customer.
     * The customer clicks the link in their email / SMS and completes the journey.
     */
    const response = await fetch(`${CREDAS_BASE_URL}/v2/ci/invites`, {
      method:  "POST",
      headers: headers(),
      body: JSON.stringify({
        journey_id:   journeyId,
        actor_id:     actorId,
        first_name:   request.firstName,
        last_name:    request.lastName,
        email:        request.email,
        phone_number: request.phone || undefined,
        reference:    request.referenceId,
        redirect_url: request.redirectUrl || undefined,
        webhook_url:  request.webhookUrl  || undefined,
        metadata: {
          homepanel_enquiry_id: request.referenceId,
          check_type: request.checkType,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      console.error("[credas] sendInvite error:", response.status, err)
      return { success: false, error: err?.message || `Credas API error: ${response.status}` }
    }

    const data = await response.json()

    return {
      success:   true,
      inviteId:  data.id       || data.invite_id,
      inviteUrl: data.url      || data.invite_url,
    }
  } catch (err) {
    console.error("[credas] sendInvite exception:", err)
    return { success: false, error: err instanceof Error ? err.message : "Request failed" }
  }
}

// ─────────────────────────────────────────────
// Poll invite / case status
// ─────────────────────────────────────────────

export async function getCredasStatus(inviteId: string): Promise<CredasStatusResponse> {
  if (!CREDAS_API_KEY) {
    return { success: true, status: "pending" }
  }

  try {
    const response = await fetch(`${CREDAS_BASE_URL}/v2/ci/invites/${inviteId}`, {
      method: "GET",
      headers: headers(),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      console.error(`[credas] getStatus error: ${response.status} ${response.statusText}`, errorBody)
      return { success: false, error: `Credas API error: ${response.status}` }
    }

    const data = await response.json()

    return {
      success:        true,
      status:         data.status,
      identityStatus: data.checks?.identity?.status,
      amlStatus:      data.checks?.aml?.status,
      sofStatus:      data.checks?.sof?.status,
      riskLevel:      data.risk_level,
      completedAt:    data.completed_at,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Request failed" }
  }
}

// ─────────────────────────────────────────────
// Validate incoming webhook signature
// Uses HMAC-SHA256 — Credas sends X-Credas-Signature header
// ─────────────────────────────────────────────

export function validateCredasWebhook(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) return true // skip validation if no secret set

  const crypto = require("crypto")
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace(/^sha256=/, ""), "hex"),
      Buffer.from(expected, "hex")
    )
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// Demo / fallback (no API key configured)
// ─────────────────────────────────────────────

function buildDemoInvite(request: CredasInviteRequest): CredasInviteResponse {
  const id  = `CREDAS-DEMO-${Date.now().toString(36).toUpperCase()}`
  const url = `https://portal.credasdemo.com/invite/demo?ref=${id}&type=${request.checkType}`
  return { success: true, inviteId: id, inviteUrl: url }
}

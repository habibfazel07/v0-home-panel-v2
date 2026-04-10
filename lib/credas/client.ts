/**
 * HomePanel — Credas API Client
 *
 * Credas handles:
 *   - Identity verification  (ID document + selfie)
 *   - AML checks             (PEPs / sanctions screening)
 *   - Address verification
 *   - Source of funds        (open banking + document upload)
 *
 * Sandbox base URL : https://portal.credasdemo.com/api
 * Live base URL    : https://portal.credas.com/api
 *
 * Docs: https://portal.credas.com/swagger/index.html
 * Support: https://apisupport.credas.com/
 */

const CREDAS_BASE_URL = process.env.CREDAS_BASE_URL || "https://portal.credasdemo.com/api"
const CREDAS_API_KEY = process.env.CREDAS_API_KEY

// Use sandbox environment if no API key or if using demo URL
const IS_SANDBOX = !CREDAS_API_KEY || CREDAS_BASE_URL.includes("credasdemo")

// Journey IDs for HomePanel account
// Standard AML provided by Credas for HomePanel sandbox account
// To get Source of Funds Journey ID, call: GET https://portal.credasdemo.com/api/v2/ci/journeys
const JOURNEY_CONFIG = {
  identity: {
    // HomePanel sandbox credentials from Credas
    sandbox: { journeyId: "5266c860-f7ec-455b-be7d-7399fc8e11a6", actorId: 17 },
    // Production credentials - will be provided by Credas when going live
    production: { journeyId: process.env.CREDAS_IDENTITY_JOURNEY_ID || "5266c860-f7ec-455b-be7d-7399fc8e11a6", actorId: 17 },
  },
  source_of_funds: {
    // Source of Funds - get Journey ID from GET /v2/ci/journeys endpoint
    // Using env var since it wasn't provided in the email
    sandbox: { journeyId: process.env.CREDAS_SOF_JOURNEY_ID || "", actorId: parseInt(process.env.CREDAS_SOF_ACTOR_ID || "0", 10) },
    production: { journeyId: process.env.CREDAS_SOF_JOURNEY_ID || "", actorId: parseInt(process.env.CREDAS_SOF_ACTOR_ID || "0", 10) },
  },
}

// Allow env vars to override journey IDs
const CREDAS_IDENTITY_JOURNEY_ID = process.env.CREDAS_IDENTITY_JOURNEY_ID
const CREDAS_IDENTITY_ACTOR_ID = process.env.CREDAS_IDENTITY_ACTOR_ID
const CREDAS_SOF_JOURNEY_ID = process.env.CREDAS_SOF_JOURNEY_ID
const CREDAS_SOF_ACTOR_ID = process.env.CREDAS_SOF_ACTOR_ID

function getJourneyConfig(checkType: CredasCheckType) {
  const env = IS_SANDBOX ? "sandbox" : "production"
  
  if (checkType === "aml") {
    return {
      journeyId: CREDAS_IDENTITY_JOURNEY_ID || JOURNEY_CONFIG.identity[env].journeyId,
      actorId: CREDAS_IDENTITY_ACTOR_ID ? parseInt(CREDAS_IDENTITY_ACTOR_ID, 10) : JOURNEY_CONFIG.identity[env].actorId,
    }
  } else {
    return {
      journeyId: CREDAS_SOF_JOURNEY_ID || JOURNEY_CONFIG.source_of_funds[env].journeyId,
      actorId: CREDAS_SOF_ACTOR_ID ? parseInt(CREDAS_SOF_ACTOR_ID, 10) : JOURNEY_CONFIG.source_of_funds[env].actorId,
    }
  }
}

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
  processId?: string    // Credas process ID
  entityId?: string     // Credas entity ID
  inviteId?: string     // Alias for processId
  inviteUrl?: string    // Magic link URL to send the customer to
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
  ProcessId: string
  ClientId: string
  Status: number       // 2 = complete
  StatusDescription: string
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CREDAS_API_KEY}`,
    "Accept": "application/json",
  }
}

export function isCredasConfigured(): boolean {
  return Boolean(CREDAS_API_KEY)
}

// ─────────────────────────────────────────────
// Create a Credas Process (send invite to client)
// POST /api/v2/ci/process
// ─────────────────────────────────────────────

export async function sendCredasInvite(
  request: CredasInviteRequest
): Promise<CredasInviteResponse> {

  // Return demo invite if no API key configured
  if (!CREDAS_API_KEY) {
    console.warn("[credas] API key not configured — returning demo invite")
    return buildDemoInvite(request)
  }

  const { journeyId, actorId } = getJourneyConfig(request.checkType)

  console.log("[credas] Creating process with journeyId:", journeyId, "actorId:", actorId)

  try {
    // Build request body per Credas API documentation
    // https://apisupport.credas.com/support/solutions/articles/44002478495-create-a-new-process-api
    const requestBody = {
      title: `HomePanel - ${request.checkType === "aml" ? "Identity Verification" : "Source of Funds"} - ${request.referenceId}`,
      journeyId: journeyId,
      webhookUrl: request.webhookUrl || undefined,
      processEntities: [
        {
          firstName: request.firstName,
          surname: request.lastName,
          emailAddress: request.email,
          phoneNumber: request.phone || undefined,
          reference: request.referenceId,
          actorId: actorId,
          contactViaEmail: true,
          contactViaSms: Boolean(request.phone),
          inPerson: false,
        },
      ],
    }

    console.log("[credas] Request body:", JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${CREDAS_BASE_URL}/v2/ci/process`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log("[credas] Response status:", response.status)
    console.log("[credas] Response body:", responseText)

    if (!response.ok) {
      let errorMessage = `Credas API error: ${response.status}`
      try {
        const errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.title || errorData.error || errorMessage
      } catch {
        // Use status text if can't parse JSON
        errorMessage = `Credas API error: ${response.status} - ${response.statusText}`
      }
      console.error("[credas] API error:", errorMessage)
      return { success: false, error: errorMessage }
    }

    const data = JSON.parse(responseText)

    // Extract processId and entityId from response
    const processId = data.id
    const entityId = data.processActors?.[0]?.entityId

    // Build magic link URL for the customer
    // Format: https://portal.credas.com/invite/{processId}
    const basePortalUrl = CREDAS_BASE_URL.replace("/api", "")
    const inviteUrl = `${basePortalUrl}/invite/${processId}`

    console.log("[credas] Process created successfully:", { processId, entityId, inviteUrl })

    return {
      success: true,
      processId: processId,
      entityId: entityId,
      inviteId: processId, // Alias for compatibility
      inviteUrl: inviteUrl,
    }
  } catch (err) {
    console.error("[credas] Exception:", err)
    return { success: false, error: err instanceof Error ? err.message : "Request failed" }
  }
}

// ─────────────────────────────────────────────
// Get Process/Entity status
// GET /api/v2/ci/process/{processId}
// ─────────────────────────────────────────────

export async function getCredasStatus(processId: string): Promise<CredasStatusResponse> {
  if (!CREDAS_API_KEY) {
    return { success: true, status: "pending" }
  }

  try {
    const response = await fetch(`${CREDAS_BASE_URL}/v2/ci/process/${processId}`, {
      method: "GET",
      headers: headers(),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "")
      console.error(`[credas] getStatus error: ${response.status}`, errorBody)
      return { success: false, error: `Credas API error: ${response.status}` }
    }

    const data = await response.json()

    // Map Credas status to our status
    let status: CredasStatusResponse["status"] = "pending"
    if (data.status === 2) status = "complete"
    else if (data.status === 1) status = "in_progress"
    else if (data.status === 3) status = "failed"

    return {
      success: true,
      status: status,
      completedAt: data.completedAt,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Request failed" }
  }
}

// ─────────────────────────────────────────────
// Get Entity summary (results)
// GET /api/v2/ci/entities/{entityId}/summary
// ─────────────────────────────────────────────

export async function getCredasEntitySummary(entityId: string): Promise<{
  success: boolean
  data?: Record<string, unknown>
  error?: string
}> {
  if (!CREDAS_API_KEY) {
    return { success: false, error: "API key not configured" }
  }

  try {
    const response = await fetch(`${CREDAS_BASE_URL}/v2/ci/entities/${entityId}/summary`, {
      method: "GET",
      headers: headers(),
    })

    if (!response.ok) {
      return { success: false, error: `Credas API error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Request failed" }
  }
}

// ─────────────────────────────────────────────
// Validate incoming webhook signature
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
  const processId = `DEMO-${Date.now().toString(36).toUpperCase()}`
  const url = `https://portal.credasdemo.com/invite/demo?ref=${processId}&type=${request.checkType}`
  return {
    success: true,
    processId: processId,
    entityId: `ENTITY-${processId}`,
    inviteId: processId,
    inviteUrl: url,
  }
}

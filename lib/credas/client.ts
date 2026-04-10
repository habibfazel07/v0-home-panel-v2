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

// Environment variables for Journey configuration
// CREDAS_AML_JOURNEY_ID - Journey ID for Identity/AML verification
// CREDAS_AML_ACTOR_ID - Actor ID for Identity/AML verification
const CREDAS_AML_JOURNEY_ID = process.env.CREDAS_AML_JOURNEY_ID
const CREDAS_AML_ACTOR_ID = process.env.CREDAS_AML_ACTOR_ID

// Fallback values (HomePanel sandbox defaults from Credas email)
const DEFAULT_AML_JOURNEY_ID = "5266c860-f7ec-455b-be7d-7399fc8e11a6"
const DEFAULT_AML_ACTOR_ID = 17

function getJourneyConfig(checkType: CredasCheckType) {
  if (checkType === "aml") {
    return {
      journeyId: CREDAS_AML_JOURNEY_ID || DEFAULT_AML_JOURNEY_ID,
      actorId: CREDAS_AML_ACTOR_ID ? parseInt(CREDAS_AML_ACTOR_ID, 10) : DEFAULT_AML_ACTOR_ID,
    }
  } else {
    // Source of Funds - for now use the same AML journey until SOF journey is configured
    // Contact Credas to get SOF journey ID, then add CREDAS_SOF_JOURNEY_ID env var
    const sofJourneyId = process.env.CREDAS_SOF_JOURNEY_ID
    const sofActorId = process.env.CREDAS_SOF_ACTOR_ID
    
    if (!sofJourneyId) {
      console.warn("[credas] CREDAS_SOF_JOURNEY_ID not configured - Source of Funds checks will not work")
      return { journeyId: "", actorId: 0 }
    }
    
    return {
      journeyId: sofJourneyId,
      actorId: sofActorId ? parseInt(sofActorId, 10) : 0,
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
    "Authorization": `Basic ${CREDAS_API_KEY}`,
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

  console.log("[credas] sendCredasInvite called")
  console.log("[credas] CREDAS_BASE_URL:", CREDAS_BASE_URL)
  console.log("[credas] CREDAS_API_KEY set:", Boolean(CREDAS_API_KEY))

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
    const requestBody: Record<string, unknown> = {
      journeyId: journeyId,
      processEntities: [
        {
          actorId: actorId,
          forename: request.firstName,
          surname: request.lastName,
          emailAddress: request.email,
          mobileNumber: request.phone || undefined,
          reference: request.referenceId,
        },
      ],
    }
    
    // Only add webhookUrl if provided
    if (request.webhookUrl) {
      requestBody.webhookUrl = request.webhookUrl
    }

    console.log("[credas] Request body:", JSON.stringify(requestBody, null, 2))

    // Credas API endpoint - ensure we use the correct path
    // Base URL from env should be: https://portal.credasdemo.com/api (sandbox) or https://portal.credas.com/api (prod)
    // But the Swagger docs show endpoints like: POST /api/v2/ci/process
    // So if CREDAS_BASE_URL already ends with /api, we should NOT add /api again
    
    // Normalize the base URL - remove trailing /api if present since we'll add the full path
    let baseUrl = CREDAS_BASE_URL.replace(/\/api\/?$/, "")
    const endpoint = `${baseUrl}/api/v2/ci/process`
    console.log("[credas] CREDAS_BASE_URL from env:", CREDAS_BASE_URL)
    console.log("[credas] Normalized baseUrl:", baseUrl)
    console.log("[credas] Calling endpoint:", endpoint)
    
    const response = await fetch(endpoint, {
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
    const baseUrl = CREDAS_BASE_URL.replace(/\/api\/?$/, "")
    const response = await fetch(`${baseUrl}/api/v2/ci/process/${processId}`, {
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
    const baseUrl = CREDAS_BASE_URL.replace(/\/api\/?$/, "")
    const response = await fetch(`${baseUrl}/api/v2/ci/entities/${entityId}/summary`, {
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

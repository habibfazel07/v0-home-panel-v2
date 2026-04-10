import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/database"
import { sendCredasInvite, isCredasConfigured } from "@/lib/credas"

/**
 * Test endpoint to diagnose Credas API issues
 * GET /api/test-credas - returns environment info
 * POST /api/test-credas - tests a Credas invite with hardcoded data
 */

export async function GET() {
  return NextResponse.json({
    configured: isCredasConfigured(),
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasCredasKey: !!process.env.CREDAS_API_KEY,
    timestamp: new Date().toISOString(),
  })
}

export async function POST() {
  try {
    console.log("[test-credas] Testing Credas invite creation...")
    
    // Test Credas API directly without database
    const inviteResponse = await sendCredasInvite({
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "07700900000",
      checkType: "aml",
      referenceId: "test-123",
      webhookUrl: "https://example.com/webhook",
      redirectUrl: "https://example.com/redirect",
    })
    
    console.log("[test-credas] Invite response:", inviteResponse)
    
    return NextResponse.json({
      success: true,
      credas: inviteResponse,
    })
  } catch (error) {
    console.error("[test-credas] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}

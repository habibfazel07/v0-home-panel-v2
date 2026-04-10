/**
 * GET /api/onboarding/demo
 * Creates a test enquiry with an onboarding token and redirects to the onboarding page.
 * FOR DEVELOPMENT/TESTING ONLY
 */

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/database"
import { randomUUID } from "crypto"

export async function GET() {
  try {
    const adminClient = createAdminClient()
    const token = randomUUID()
    
    // Check if we have a demo enquiry
    const { data: existingDemo } = await adminClient
      .from("enquiries")
      .select("id, onboarding_token")
      .eq("email", "demo@homepanel.test")
      .single()
    
    if (existingDemo?.onboarding_token) {
      // Redirect to existing demo
      return NextResponse.redirect(new URL(`/onboarding/${existingDemo.onboarding_token}`, process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"))
    }
    
    // Create a new demo enquiry
    const { data: newEnquiry, error } = await adminClient
      .from("enquiries")
      .insert({
        first_name: "Demo",
        last_name: "User",
        email: "demo@homepanel.test",
        phone: "+447700900000",
        transaction_type: "purchase",
        status: "new",
        internal_status: "pending_onboarding",
        onboarding_token: token,
        onboarding_status: "pending",
        onboarding_data: {},
        property_address: "123 Demo Street, London, SW1A 1AA",
        property_price: 500000,
      })
      .select("id, onboarding_token")
      .single()
    
    if (error) {
      console.error("[demo] Failed to create demo enquiry:", error)
      return NextResponse.json({ 
        error: "Failed to create demo enquiry", 
        details: error.message,
        hint: "Make sure the enquiries table exists with the required columns"
      }, { status: 500 })
    }
    
    // Redirect to the onboarding page
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    return NextResponse.redirect(new URL(`/onboarding/${newEnquiry.onboarding_token}`, baseUrl))
    
  } catch (error) {
    console.error("[demo] Error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

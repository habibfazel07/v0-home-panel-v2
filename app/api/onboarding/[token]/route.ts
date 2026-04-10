import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

// GET - Fetch enquiry by onboarding token
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    if (!token || token.length < 10) {
      return NextResponse.json(
        { error: "Invalid onboarding link" },
        { status: 400 }
      )
    }
    
    const { data: enquiry, error } = await supabase
      .from("enquiries")
      .select(`
        id, 
        first_name, 
        last_name, 
        email, 
        phone, 
        property_address, 
        transaction_type, 
        case_reference, 
        onboarding_status, 
        onboarding_data,
        assigned_firm_id,
        created_at
      `)
      .eq("onboarding_token", token)
      .single()

    if (error || !enquiry) {
      return NextResponse.json(
        { error: "Invalid or expired onboarding link" },
        { status: 404 }
      )
    }

    // Check if link has expired (30 days)
    const createdAt = new Date(enquiry.created_at)
    const now = new Date()
    const daysSinceCreated = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysSinceCreated > 30) {
      return NextResponse.json(
        { error: "This onboarding link has expired. Please contact your conveyancer for a new link." },
        { status: 410 }
      )
    }

    // Fetch compliance checks if any
    const { data: complianceChecks } = await supabase
      .from("compliance_checks")
      .select("id, check_type, provider, status, completed_at, summary_json")
      .eq("enquiry_id", enquiry.id)

    // Fetch firm data if assigned
    let firmData = null
    if (enquiry.assigned_firm_id) {
      const { data: firm } = await supabase
        .from("firms")
        .select("id, name, brand_color, logo_url, contact_email, contact_phone")
        .eq("id", enquiry.assigned_firm_id)
        .single()
      firmData = firm
    }

    return NextResponse.json({ 
      enquiry: {
        ...enquiry,
        firm: firmData,
        compliance_checks: complianceChecks || []
      }
    })
  } catch (err) {
    console.error("Onboarding GET error:", err)
    return NextResponse.json(
      { error: "Failed to fetch onboarding data" },
      { status: 500 }
    )
  }
}

// POST - Save onboarding progress
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { step, data } = await request.json()

    if (!token || !step) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      )
    }

    // Fetch current enquiry
    const { data: enquiry, error: fetchError } = await supabase
      .from("enquiries")
      .select("id, email, first_name, last_name, onboarding_data, case_reference")
      .eq("onboarding_token", token)
      .single()

    if (fetchError || !enquiry) {
      return NextResponse.json(
        { error: "Invalid onboarding link" },
        { status: 404 }
      )
    }

    // Merge new data with existing
    const currentData = (enquiry.onboarding_data as Record<string, unknown>) || {}
    let updatedData: Record<string, unknown> = { ...currentData }
    let newStatus = "in_progress"
    let notifyAdmin = false
    let stepLabel = ""

    switch (step) {
      case "personal_details":
        updatedData.personal_details = data
        stepLabel = "Personal Details"
        notifyAdmin = true
        break
        
      case "id_verification":
        updatedData.id_verification = data
        stepLabel = "Identity Verification"
        notifyAdmin = true
        
        // Create or update compliance check record
        if (data.completed) {
          await upsertComplianceCheck(enquiry.id, "identity_verification", "credas", {
            status: "completed",
            completed_at: data.completed_at,
            summary_json: {
              provider: "credas",
              client_marked_complete: true,
              awaiting_provider_result: true
            }
          })
        }
        break
        
      case "source_of_funds":
        updatedData.source_of_funds = data
        stepLabel = "Source of Funds"
        notifyAdmin = true
        
        // Create or update compliance check record
        if (data.completed) {
          await upsertComplianceCheck(enquiry.id, "source_of_funds", "credas", {
            status: "completed",
            completed_at: data.completed_at,
            summary_json: {
              provider: "credas",
              client_marked_complete: true,
              awaiting_provider_result: true
            }
          })
        }
        break
        
      case "documents":
        updatedData.documents = data
        stepLabel = "Documents Uploaded"
        notifyAdmin = true
        break
        
      case "submit":
        newStatus = "completed"
        updatedData.submitted_at = data.submitted_at || new Date().toISOString()
        stepLabel = "Onboarding Submitted"
        notifyAdmin = true
        
        // Update internal status to pending review
        await supabase
          .from("enquiries")
          .update({ internal_status: "pending_internal_review" })
          .eq("id", enquiry.id)
        break
    }

    // Update enquiry
    const { error: updateError } = await supabase
      .from("enquiries")
      .update({
        onboarding_data: updatedData,
        onboarding_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiry.id)

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 }
      )
    }

    // Log activity
    try {
      await supabase.from("activity_log").insert({
        enquiry_id: enquiry.id,
        action: `onboarding_${step}`,
        description: `Client completed: ${stepLabel}`,
        actor_type: "client",
      })
    } catch {
      // Activity logging is non-critical
    }

    // Notify admin
    if (notifyAdmin && process.env.RESEND_API_KEY) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL 
        || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
        || "https://v0-home-panel-v2.vercel.app"
        
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "HomePanel <onboarding@resend.dev>",
          to: process.env.ADMIN_EMAIL || "joshua@madebymclean.com",
          subject: step === "submit" 
            ? `Onboarding Complete: ${enquiry.first_name} ${enquiry.last_name}`
            : `Onboarding Progress: ${enquiry.first_name} - ${stepLabel}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="width: 48px; height: 48px; background: #1a1a1a; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
              </div>
              
              <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px 0; text-align: center;">
                ${step === "submit" ? "Onboarding Complete" : "Onboarding Progress"}
              </h1>
              
              <p style="color: #666; margin: 0 0 32px 0; text-align: center;">
                ${step === "submit" 
                  ? `${enquiry.first_name} ${enquiry.last_name} has completed their onboarding and is ready for review.`
                  : `${enquiry.first_name} ${enquiry.last_name} has completed: ${stepLabel}`
                }
              </p>
              
              <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Reference</p>
                <p style="margin: 0; font-weight: 600; font-family: monospace;">${enquiry.case_reference || enquiry.id.slice(0, 8).toUpperCase()}</p>
              </div>
              
              <a href="${baseUrl}/admin/enquiries/${enquiry.id}" 
                 style="display: block; background: #1a1a1a; color: white; text-decoration: none; padding: 16px 24px; border-radius: 12px; text-align: center; font-weight: 500;">
                View in Dashboard
              </a>
              
              <p style="color: #999; font-size: 12px; text-align: center; margin-top: 32px;">
                HomePanel Conveyancing Platform
              </p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error("Email notification error:", emailError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Onboarding POST error:", err)
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    )
  }
}

// Helper to upsert compliance check
async function upsertComplianceCheck(
  enquiryId: string,
  checkType: string,
  provider: string,
  data: {
    status: string
    completed_at?: string
    summary_json?: Record<string, unknown>
  }
) {
  try {
    // Check if record exists
    const { data: existing } = await supabase
      .from("compliance_checks")
      .select("id")
      .eq("enquiry_id", enquiryId)
      .eq("check_type", checkType)
      .single()

    if (existing) {
      // Update
      await supabase
        .from("compliance_checks")
        .update({
          status: data.status,
          completed_at: data.completed_at,
          summary_json: data.summary_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      // Insert
      await supabase
        .from("compliance_checks")
        .insert({
          enquiry_id: enquiryId,
          check_type: checkType,
          provider: provider,
          status: data.status,
          completed_at: data.completed_at,
          summary_json: data.summary_json,
        })
    }
  } catch (err) {
    console.error("Failed to upsert compliance check:", err)
  }
}

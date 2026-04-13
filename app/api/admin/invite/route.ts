import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import { randomUUID } from "crypto"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey)
    
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { enquiryId } = await request.json()
    
    if (!enquiryId) {
      return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 })
    }

    const { data: enquiry, error: enquiryError } = await adminSupabase
      .from("enquiries")
      .select("*")
      .eq("id", enquiryId)
      .single()

    if (enquiryError || !enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
    }

    const onboardingToken = randomUUID()
    const caseReference = enquiry.case_reference || `HP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(5, "0")}`

    // Build onboarding URL — strip trailing slash to avoid double slash
    const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL 
      || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null)
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
      || "https://thehomepanel.netlify.app"
    const baseUrl = rawBaseUrl.replace(/\/$/, "")
    const onboardingUrl = `${baseUrl}/onboarding/${onboardingToken}`

    const { error: updateError } = await adminSupabase
      .from("enquiries")
      .update({ 
        status: "onboarding_invited",
        case_reference: caseReference,
        onboarding_token: onboardingToken,
        onboarding_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", enquiryId)

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json({ error: "Failed to update enquiry" }, { status: 500 })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "The Home Panel <onboarding@resend.dev>"
    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: enquiry.email,
      subject: `Your The Home Panel onboarding link — ${caseReference}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:32px 16px;background-color:#f5f5f3;">

  <div style="text-align:center;margin-bottom:24px;">
    <img src="${baseUrl}/logo.svg" alt="The Home Panel" width="40" height="40" style="display:inline-block;" />
    <p style="margin:6px 0 0;font-size:13px;color:#999;letter-spacing:0.04em;text-transform:uppercase;">The Home Panel</p>
  </div>

  <div style="background:#fff;border-radius:20px;padding:40px 36px;box-shadow:0 1px 4px rgba(0,0,0,0.07);">

    <h1 style="font-size:22px;font-weight:700;margin:0 0 6px;color:#1a1a1a;">Hi ${enquiry.first_name},</h1>
    <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.7;">
      Great news — we've reviewed your enquiry and we're ready to move forward. Please complete your secure onboarding below. It takes around 10 minutes.
    </p>

    <div style="background:#f9f9f7;border:1px solid #e8e4de;border-radius:14px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:0.05em;">Your case reference</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px;">${caseReference}</p>
    </div>

    <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#888;margin:0 0 14px;">What you'll need to complete</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
      <tr><td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0f0f0;">✓ &nbsp;Personal details confirmation</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0f0f0;">✓ &nbsp;Photo ID verification</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#555;border-bottom:1px solid #f0f0f0;">✓ &nbsp;Source of funds declaration</td></tr>
      <tr><td style="padding:8px 0;font-size:14px;color:#555;">✓ &nbsp;Document upload</td></tr>
    </table>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${onboardingUrl}" style="display:inline-block;background:#1a1a1a;color:white;padding:14px 36px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.2px;">Begin your onboarding →</a>
    </div>

    <p style="color:#aaa;font-size:13px;text-align:center;margin:0 0 8px;">This link expires in 7 days and is unique to you.</p>
    <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">If the button doesn't work, copy this link: <a href="${onboardingUrl}" style="color:#aaa;word-break:break-all;">${onboardingUrl}</a></p>

  </div>

  <p style="color:#bbb;font-size:12px;text-align:center;margin-top:24px;line-height:1.8;">
    The Home Panel · <a href="${baseUrl}" style="color:#bbb;text-decoration:none;">thehomepanel.co.uk</a><br>
    One Canada Square, Canary Wharf, London
  </p>

</body>
</html>
      `,
    })

    if (emailError) {
      console.error("Resend email error:", emailError)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    try {
      await adminSupabase.from("activity_log").insert({
        enquiry_id: enquiryId,
        action: "onboarding_invited",
        description: `Onboarding invite sent to ${enquiry.email}`,
        actor_type: "admin",
        actor_id: user.id,
      })
    } catch {
      // Activity logging is non-critical, ignore errors
    }

    return NextResponse.json({ 
      success: true, 
      caseReference,
      onboardingUrl,
      message: `Onboarding invite sent to ${enquiry.email}` 
    })

  } catch (error) {
    console.error("Invite error:", error)
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 })
  }
}

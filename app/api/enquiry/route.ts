import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import type { EnquiryFormData } from "@/lib/form-schema"
import { getCustomerConfirmationEmail, getInternalAlertEmail } from "@/lib/email-templates"
import { logActivity } from "@/lib/database"

const INTERNAL_EMAIL = process.env.INTERNAL_EMAIL || "joshua@madebymclean.com"
const FROM_EMAIL = process.env.FROM_EMAIL || "HomePanel <onboarding@resend.dev>"

const submitSchema = z.object({
  termsAccepted: z.boolean(),
  marketingConsent: z.boolean().optional(),
  interestSolar: z.boolean().optional(),
  interestBoiler: z.boolean().optional(),
  transactionType: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
}).passthrough()

function calculateFees(data: EnquiryFormData) {
  const propertyValue = parseFloat(data.propertyValue?.replace(/,/g, "") || "0")
  
  let legalFee = 595
  if (propertyValue > 250000) legalFee = 695
  if (propertyValue > 500000) legalFee = 895
  if (propertyValue > 1000000) legalFee = 1295
  
  const isLeasehold = data.tenure === "leasehold"
  const hasMortgage = data.hasMortgage === "yes"
  const isNewBuild = data.isNewBuild === "yes"
  const isCompanyPurchase = data.isCompanyPurchase === "yes"
  const hasGiftFunds = data.hasGiftFunds === "yes"
  
  const leaseholdSupplement = isLeasehold ? 195 : 0
  const mortgageFee = hasMortgage ? 95 : 0
  const newBuildFee = isNewBuild ? 195 : 0
  const companyFee = isCompanyPurchase ? 295 : 0
  const giftFundsFee = hasGiftFunds ? 50 : 0
  
  const subtotal = legalFee + leaseholdSupplement + mortgageFee + newBuildFee + companyFee + giftFundsFee
  const vat = Math.round(subtotal * 0.2)
  
  const searchFees = 300
  const landRegistryFee = propertyValue > 500000 ? 295 : propertyValue > 250000 ? 150 : 100
  const bankTransferFee = 35
  const disbursements = searchFees + landRegistryFee + bankTransferFee
  
  const total = subtotal + vat + disbursements
  
  return { 
    legalFee, 
    leaseholdSupplement, 
    mortgageFee, 
    newBuildFee, 
    companyFee, 
    giftFundsFee, 
    subtotal, 
    vat, 
    disbursements, 
    total 
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = submitSchema.parse(body) as EnquiryFormData
    const fees = calculateFees(validatedData)
    const propertyValue = parseFloat(validatedData.propertyValue?.replace(/,/g, "") || "0")

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      // Base enquiry data (required columns only)
      const baseEnquiryData: Record<string, unknown> = {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone || null,
        property_address: validatedData.propertyAddressLine1 || null,
        property_postcode: validatedData.propertyPostcode || null,
        transaction_type: validatedData.transactionType,
        property_value: propertyValue || null,
        quote_amount: fees.total,
        status: "new",
      }
      
      // Try insert with all fields first, fall back to base if columns don't exist
      const now = new Date().toISOString()
      const fullEnquiryData = {
        ...baseEnquiryData,
        terms_accepted: validatedData.termsAccepted || false,
        terms_accepted_at: validatedData.termsAccepted ? now : null,
        marketing_consent: validatedData.marketingConsent || false,
        marketing_consent_at: validatedData.marketingConsent ? now : null,
        interest_solar: validatedData.interestSolar || false,
        interest_boiler: validatedData.interestBoiler || false,
      }
      
      let newEnquiry = null
      let dbError = null
      
      console.log("[v0] Attempting full insert with terms/consent fields...")
      
      // Try full insert first
      const fullResult = await supabase.from("enquiries").insert(fullEnquiryData).select("id").single()
      
      if (fullResult.error?.message?.includes("column") || fullResult.error?.message?.includes("schema")) {
        // Fallback to base insert if new columns don't exist yet
        console.log("[v0] New columns not available, using base insert. Error was:", fullResult.error?.message)
        const baseResult = await supabase.from("enquiries").insert(baseEnquiryData).select("id").single()
        newEnquiry = baseResult.data
        dbError = baseResult.error
      } else {
        console.log("[v0] Full insert successful with terms/consent fields")
        newEnquiry = fullResult.data
        dbError = fullResult.error
      }
      
      if (dbError) {
        console.error("[v0] DB insert error:", dbError.message)
      } else {
        console.log("[v0] Enquiry created successfully:", newEnquiry?.id)
      }

      // Log activity
      if (newEnquiry?.id) {
        await logActivity({
          enquiryId: newEnquiry.id,
          actorType: "system",
          action: "enquiry_submitted",
          description: `New enquiry from ${validatedData.firstName} ${validatedData.lastName}`,
          metadata: { 
            transaction_type: validatedData.transactionType,
            quote_amount: fees.total 
          }
        })
      }
    }

    const apiKey = process.env.RESEND_API_KEY
    if (apiKey) {
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      
      const customerEmail = getCustomerConfirmationEmail(validatedData)
      const internalEmail = getInternalAlertEmail(validatedData)

      await Promise.allSettled([
        resend.emails.send({
          from: FROM_EMAIL,
          to: INTERNAL_EMAIL,
          subject: internalEmail.subject,
          html: internalEmail.html,
          text: internalEmail.text,
        }),
        resend.emails.send({
          from: FROM_EMAIL,
          to: validatedData.email,
          subject: customerEmail.subject,
          html: customerEmail.html,
          text: customerEmail.text,
        })
      ])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Enquiry error:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
    }

    return NextResponse.json({ error: "Failed to submit enquiry" }, { status: 500 })
  }
}

"use client"

import { useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  enquiryFormSchema,
  transactionTypes,
  tenureTypes,
  ownerCountOptions,
  propertyCountOptions,
  type EnquiryFormData,
} from "@/lib/form-schema"
import { cn } from "@/lib/utils"
import {
  FormField,
  TextInput,
  RadioCardGroup,
  CheckboxField,
  StepHeader,
  InfoBox,
  ProgressIndicator,
  AddressAutocomplete,
  type AddressData,
} from "@/components/forms"

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type StepType = 
  | "terms-conditions"
  | "product-interests"
  | "transaction-type"
  | "property-address"
  | "tenure"
  | "property-value"
  | "owner-count"
  | "first-time-buyer"
  | "property-count"
  | "new-build"
  | "mortgage"
  | "company-purchase"
  | "gift-funds"
  | "bank-funds-only"
  | "personal-details"
  | "quote"

const agents = [
  {
    name: "Sarah Mitchell",
    role: "Senior Conveyancer",
    image: "/agents/sarah-mitchell.jpg",
  },
  {
    name: "James Thompson",
    role: "Property Solicitor",
    image: "/agents/james-thompson.jpg",
  },
]

// ============================================================================
// FEE CALCULATION — HomePanel Pricing (effective April 2025)
// ============================================================================

function calcLegalFee(propertyValue: number, transactionType: string): number {
  if (transactionType === "remortgage") {
    // Remortgage fee bands
    if (propertyValue <= 250000) return 499
    if (propertyValue <= 500000) return 599
    if (propertyValue <= 750000) return 699
    if (propertyValue <= 1000000) return 799
    return 999
  }
  // Sale & Purchase (freehold base) fee bands
  if (propertyValue <= 150000) return 695
  if (propertyValue <= 250000) return 795
  if (propertyValue <= 350000) return 895
  if (propertyValue <= 500000) return 995
  if (propertyValue <= 650000) return 1095
  if (propertyValue <= 800000) return 1195
  if (propertyValue <= 1000000) return 1395
  return 1595
}

function calcSDLT(price: number, isFTB: boolean, isAdditional: boolean): number {
  if (price <= 0) return 0
  if (isFTB && !isAdditional) {
    if (price <= 425000) return 0
    if (price <= 625000) return Math.round((price - 425000) * 0.05)
    // No FTB relief above £625k — standard rates apply
  }
  const additional = isAdditional ? 0.03 : 0
  const bands: [number, number][] = [[250000, 0], [925000, 0.05], [1500000, 0.10], [Infinity, 0.12]]
  let sdlt = 0
  let prev = 0
  for (const [limit, rate] of bands) {
    if (price <= limit) { sdlt += (price - prev) * (rate + additional); break }
    sdlt += (limit - prev) * (rate + additional)
    prev = limit
  }
  return Math.round(sdlt)
}

function calcLandRegistryFee(propertyValue: number): number {
  if (propertyValue <= 80000) return 20
  if (propertyValue <= 100000) return 40
  if (propertyValue <= 200000) return 100
  if (propertyValue <= 500000) return 270
  if (propertyValue <= 1000000) return 540
  return 1105
}

function calculateFees(data: Partial<EnquiryFormData>) {
  const propertyValue = parseFloat(data.propertyValue?.replace(/,/g, "") || "0")
  const transactionType = data.transactionType || "buying"

  const isLeasehold = data.tenure === "leasehold"
  const isNewBuild = data.isNewBuild === "yes"
  const isCompanyPurchase = data.isCompanyPurchase === "yes"
  const hasGiftFunds = data.hasGiftFunds === "yes"
  const isFTB = data.firstTimeBuyer === "yes"
  const isAdditional = data.propertyCount === "more-than-one"

  const legalFee = calcLegalFee(propertyValue, transactionType)
  const leaseholdSupplement = isLeasehold ? 250 : 0
  const newBuildFee = isNewBuild ? 300 : 0
  const companyFee = isCompanyPurchase ? 295 : 0
  const giftFundsFee = hasGiftFunds ? 50 : 0

  // Disbursements
  const isPurchase = transactionType === "buying" || transactionType === "buying-selling"
  const isSale = transactionType === "selling"
  const searchFees = isPurchase ? 350 : 0
  const landRegistryFee = isSale ? 0 : calcLandRegistryFee(propertyValue)
  const bankTransferFee = 36 // inc VAT per transfer

  // SDLT (purchase only)
  const sdlt = isPurchase ? calcSDLT(propertyValue, isFTB, isAdditional) : 0

  const subtotal = legalFee + leaseholdSupplement + newBuildFee + companyFee + giftFundsFee
  const vat = Math.round(subtotal * 0.2)
  const disbursements = searchFees + landRegistryFee + bankTransferFee
  const totalExSDLT = subtotal + vat + disbursements
  const total = totalExSDLT + sdlt

  return {
    legalFee,
    leaseholdSupplement,
    newBuildFee,
    companyFee,
    giftFundsFee,
    searchFees,
    landRegistryFee,
    bankTransferFee,
    sdlt,
    subtotal,
    vat,
    disbursements,
    totalExSDLT,
    total,
    isFTB,
    isAdditional,
    transactionLabel:
      transactionType === "buying" ? "purchase" :
      transactionType === "selling" ? "sale" :
      transactionType === "buying-selling" ? "purchase & sale" :
      transactionType === "remortgage" ? "remortgage" : "transfer of equity"
  }
}

// ============================================================================
// STEP FLOW LOGIC
// ============================================================================

function getStepsForTransaction(transactionType: string): StepType[] {
  const preSteps: StepType[] = ["terms-conditions", "product-interests", "transaction-type"]
  
  if (transactionType === "buying" || transactionType === "buying-selling") {
    return [
      ...preSteps,
      "property-address",
      "tenure",
      "property-value",
      "owner-count",
      "first-time-buyer",
      "property-count",
      "new-build",
      "mortgage",
      "company-purchase",
      "gift-funds",
      "bank-funds-only",
      "personal-details",
      "quote",
    ]
  }
  
  if (transactionType === "selling") {
    return [
      ...preSteps,
      "property-address",
      "tenure",
      "property-value",
      "owner-count",
      "mortgage",
      "personal-details",
      "quote",
    ]
  }
  
  if (transactionType === "remortgage") {
    return [
      ...preSteps,
      "property-address",
      "tenure",
      "property-value",
      "owner-count",
      "personal-details",
      "quote",
    ]
  }
  
  if (transactionType === "transfer-equity") {
    return [
      ...preSteps,
      "property-address",
      "tenure",
      "property-value",
      "owner-count",
      "mortgage",
      "personal-details",
      "quote",
    ]
  }
  
  return preSteps
}

// ============================================================================
// MAIN FORM COMPONENT
// ============================================================================

export function MultiStepForm() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressData, setAddressData] = useState<AddressData | null>(null)

  const form = useForm<EnquiryFormData>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      termsAccepted: false,
      marketingConsent: false,
      interestSolar: false,
      interestBoiler: false,
      transactionType: "",
      propertyAddressLine1: "",
      propertyAddressLine2: "",
      propertyCity: "",
      propertyPostcode: "",
      propertyAddressUnknown: false,
      tenure: "",
      propertyValue: "",
      ownerCount: "",
      firstTimeBuyer: "",
      propertyCount: "",
      isNewBuild: "",
      hasMortgage: "",
      isCompanyPurchase: "",
      hasGiftFunds: "",
      bankFundsOnly: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    },
    mode: "onChange",
  })

  const { handleSubmit, watch, setValue, formState: { errors }, trigger } = form
  const watchedValues = watch()
  
  const steps = useMemo(() => 
    getStepsForTransaction(watchedValues.transactionType),
    [watchedValues.transactionType]
  )
  
  const currentStep = steps[currentStepIndex] || "terms-conditions"
  const totalSteps = steps.length || 1

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    switch (currentStep) {
      case "terms-conditions":
        return watchedValues.termsAccepted === true
      case "product-interests":
        return true
      case "transaction-type":
        return !!watchedValues.transactionType
      case "property-address":
        return watchedValues.propertyAddressUnknown || (!!watchedValues.propertyPostcode && watchedValues.propertyPostcode.length >= 5)
      case "tenure":
        return !!watchedValues.tenure
      case "property-value":
        return !!watchedValues.propertyValue
      case "owner-count":
        return !!watchedValues.ownerCount
      case "first-time-buyer":
        return !!watchedValues.firstTimeBuyer
      case "property-count":
        return !!watchedValues.propertyCount
      case "new-build":
        return !!watchedValues.isNewBuild
      case "mortgage":
        return !!watchedValues.hasMortgage
      case "company-purchase":
        return !!watchedValues.isCompanyPurchase
      case "gift-funds":
        return !!watchedValues.hasGiftFunds
      case "bank-funds-only":
        return !!watchedValues.bankFundsOnly
      case "personal-details":
        return await trigger(["firstName", "lastName", "email", "phone"])
      case "quote":
        return true
      default:
        return true
    }
  }, [currentStep, watchedValues, trigger])

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const nextStep = useCallback(async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }, [validateCurrentStep, currentStepIndex, steps.length])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }, [currentStepIndex])

  // ============================================================================
  // SUBMISSION
  // ============================================================================

  const onSubmit = async (data: EnquiryFormData) => {
    setIsSubmitting(true)
    setError(null)
    
    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Something went wrong. Please try again.")
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // DECLINE & FEEDBACK
  // ============================================================================

  const handleDecline = async () => {
    setShowFeedbackForm(true)
    
    try {
      await fetch("/api/enquiry/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: watchedValues.firstName,
          lastName: watchedValues.lastName,
          email: watchedValues.email,
        }),
      })
    } catch {
      // Silent fail - still show feedback form
    }
  }

  const handleFeedbackSubmit = async (reasons: string[], otherReason?: string) => {
    setIsSubmitting(true)
    try {
      await fetch("/api/enquiry/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: watchedValues.firstName,
          lastName: watchedValues.lastName,
          email: watchedValues.email,
          reasons,
          otherReason,
          quoteAmount: calculateFees(watchedValues).total,
        }),
      })
      setFeedbackSubmitted(true)
    } catch {
      setFeedbackSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // ADDRESS HANDLING
  // ============================================================================

  const handleAddressChange = (address: AddressData | null) => {
    setAddressData(address)
    if (address) {
      setValue("propertyAddressLine1", address.addressLine1)
      setValue("propertyAddressLine2", address.addressLine2)
      setValue("propertyCity", address.city)
      setValue("propertyPostcode", address.postcode)
    }
  }

  const handlePostcodeChange = (postcode: string) => {
    setValue("propertyPostcode", postcode)
  }

  // ============================================================================
  // RENDER: SUCCESS STATE
  // ============================================================================

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16"
      >
        <div className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold mb-3">Enquiry submitted</h2>
        <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
          Thank you for your enquiry. A member of the HomePanel team will be in touch shortly to guide you through the next steps.
        </p>
      </motion.div>
    )
  }

  // ============================================================================
  // RENDER: FEEDBACK FORM
  // ============================================================================

  if (showFeedbackForm) {
    return (
      <FeedbackForm
        firstName={watchedValues.firstName}
        isSubmitting={isSubmitting}
        feedbackSubmitted={feedbackSubmitted}
        onSubmit={handleFeedbackSubmit}
      />
    )
  }

  // ============================================================================
  // RENDER: MAIN FORM
  // ============================================================================

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Back button */}
        <div className="p-4 pb-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="rounded-lg text-muted-foreground hover:text-foreground -ml-2"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>
        
        {/* Progress */}
        <div className="px-6 pt-4">
          <ProgressIndicator
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
          />
        </div>

        {/* Form content */}
        <div className="p-6 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="min-h-[320px]"
            >
              {/* STEP: Terms & Conditions */}
              {currentStep === "terms-conditions" && (
                <TermsConditionsStep
                  termsAccepted={watchedValues.termsAccepted || false}
                  marketingConsent={watchedValues.marketingConsent || false}
                  onTermsChange={(checked) => setValue("termsAccepted", checked)}
                  onMarketingChange={(checked) => setValue("marketingConsent", checked)}
                />
              )}

              {/* STEP: Product Interests */}
              {currentStep === "product-interests" && (
                <ProductInterestsStep
                  interestSolar={watchedValues.interestSolar || false}
                  interestBoiler={watchedValues.interestBoiler || false}
                  onSolarChange={(checked) => setValue("interestSolar", checked)}
                  onBoilerChange={(checked) => setValue("interestBoiler", checked)}
                />
              )}

              {/* STEP: Transaction Type */}
              {currentStep === "transaction-type" && (
                <TransactionTypeStep
                  value={watchedValues.transactionType}
                  onChange={(value) => setValue("transactionType", value)}
                />
              )}

              {/* STEP: Property Address */}
              {currentStep === "property-address" && (
                <PropertyAddressStep
                  transactionType={watchedValues.transactionType}
                  postcode={watchedValues.propertyPostcode || ""}
                  addressUnknown={watchedValues.propertyAddressUnknown || false}
                  addressData={addressData}
                  onAddressChange={handleAddressChange}
                  onPostcodeChange={handlePostcodeChange}
                  onAddressUnknownChange={(checked) => setValue("propertyAddressUnknown", checked)}
                />
              )}

              {/* STEP: Tenure */}
              {currentStep === "tenure" && (
                <TenureStep
                  value={watchedValues.tenure || ""}
                  onChange={(value) => setValue("tenure", value)}
                />
              )}

              {/* STEP: Property Value */}
              {currentStep === "property-value" && (
                <PropertyValueStep
                  value={watchedValues.propertyValue || ""}
                  onChange={(value) => setValue("propertyValue", value)}
                />
              )}

              {/* STEP: Owner Count */}
              {currentStep === "owner-count" && (
                <OwnerCountStep
                  value={watchedValues.ownerCount || ""}
                  onChange={(value) => setValue("ownerCount", value)}
                />
              )}

              {/* STEP: First Time Buyer */}
              {currentStep === "first-time-buyer" && (
                <FirstTimeBuyerStep
                  value={watchedValues.firstTimeBuyer || ""}
                  onChange={(value) => setValue("firstTimeBuyer", value)}
                />
              )}

              {/* STEP: Property Count */}
              {currentStep === "property-count" && (
                <PropertyCountStep
                  value={watchedValues.propertyCount || ""}
                  onChange={(value) => setValue("propertyCount", value)}
                />
              )}

              {/* STEP: New Build */}
              {currentStep === "new-build" && (
                <NewBuildStep
                  value={watchedValues.isNewBuild || ""}
                  onChange={(value) => setValue("isNewBuild", value)}
                />
              )}

              {/* STEP: Mortgage */}
              {currentStep === "mortgage" && (
                <MortgageStep
                  value={watchedValues.hasMortgage || ""}
                  onChange={(value) => setValue("hasMortgage", value)}
                />
              )}

              {/* STEP: Company Purchase */}
              {currentStep === "company-purchase" && (
                <CompanyPurchaseStep
                  value={watchedValues.isCompanyPurchase || ""}
                  onChange={(value) => setValue("isCompanyPurchase", value)}
                />
              )}

              {/* STEP: Gift Funds */}
              {currentStep === "gift-funds" && (
                <GiftFundsStep
                  value={watchedValues.hasGiftFunds || ""}
                  onChange={(value) => setValue("hasGiftFunds", value)}
                />
              )}

              {/* STEP: Bank Funds Only */}
              {currentStep === "bank-funds-only" && (
                <BankFundsOnlyStep
                  value={watchedValues.bankFundsOnly || ""}
                  onChange={(value) => setValue("bankFundsOnly", value)}
                />
              )}

              {/* STEP: Personal Details */}
              {currentStep === "personal-details" && (
                <PersonalDetailsStep
                  values={watchedValues}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  onFieldChange={(field, value) => setValue(field, value)}
                />
              )}

              {/* STEP: Quote */}
              {currentStep === "quote" && (
                <QuoteStep values={watchedValues} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-end mt-8">
            {currentStep === "quote" ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={handleDecline}
                  className="rounded-xl border-border h-12 order-2 sm:order-1"
                >
                  No thanks
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  className="rounded-xl bg-foreground hover:bg-foreground/90 text-background px-8 h-12 order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Proceed with HomePanel"
                  )}
                </Button>
              </div>
            ) : currentStep === "personal-details" ? (
              <Button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-foreground hover:bg-foreground/90 text-background h-12 px-6"
              >
                Get My Quote
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={nextStep}
                className="rounded-xl bg-foreground hover:bg-foreground/90 text-background h-12 px-6"
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function TermsConditionsStep({
  termsAccepted,
  marketingConsent,
  onTermsChange,
  onMarketingChange,
}: {
  termsAccepted: boolean
  marketingConsent: boolean
  onTermsChange: (checked: boolean) => void
  onMarketingChange: (checked: boolean) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Before we begin"
        description="Please review and accept our terms to continue with your enquiry."
        align="center"
      />

      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <Checkbox
              id="termsAccepted"
              checked={termsAccepted}
              onCheckedChange={(checked) => onTermsChange(checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label htmlFor="termsAccepted" className="text-sm font-medium cursor-pointer block">
                I agree to Emerald Green Energy&apos;s Terms and Conditions <span className="text-destructive">*</span>
              </label>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                By checking this box, I acknowledge and consent to Emerald Green Energy Limited collecting, processing, and sharing my personal information with authorised third-party partners for the purpose of providing quotations, services, and related communications regarding home energy products and conveyancing services. I understand that my data will be handled in accordance with applicable data protection laws, including the UK GDPR, and that I may withdraw my consent at any time by contacting Emerald Green Energy Limited directly.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <Checkbox
              id="marketingConsent"
              checked={marketingConsent}
              onCheckedChange={(checked) => onMarketingChange(checked as boolean)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label htmlFor="marketingConsent" className="text-sm font-medium cursor-pointer block">
                I would like to receive marketing communications (optional)
              </label>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Tick this box if you would like to receive promotional offers, product updates, and marketing materials from Emerald Green Energy and our trusted partners via email, phone, or SMS. You can unsubscribe at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {!termsAccepted && (
        <p className="text-sm text-muted-foreground text-center">
          You must accept the terms and conditions to continue.
        </p>
      )}
    </div>
  )
}

function ProductInterestsStep({
  interestSolar,
  interestBoiler,
  onSolarChange,
  onBoilerChange,
}: {
  interestSolar: boolean
  interestBoiler: boolean
  onSolarChange: (checked: boolean) => void
  onBoilerChange: (checked: boolean) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        title="Are you interested in any of these services?"
        description="Select any that apply. This helps us provide relevant information about additional services that may benefit your home."
        align="center"
      />

      <div className="space-y-3">
        <CheckboxField
          id="interestSolar"
          label="Solar Products for the Home"
          description="Solar panels, battery storage systems, and renewable energy solutions to reduce your energy bills and carbon footprint."
          checked={interestSolar}
          onCheckedChange={onSolarChange}
          variant="card"
        />

        <CheckboxField
          id="interestBoiler"
          label="Boiler Products and Services"
          description="New boiler installations, heating system upgrades, and maintenance services for improved home comfort and efficiency."
          checked={interestBoiler}
          onCheckedChange={onBoilerChange}
          variant="card"
        />
      </div>

      <InfoBox>
        These selections are optional and will not affect your conveyancing quote. We may contact you with relevant offers based on your interests.
      </InfoBox>
    </div>
  )
}

function TransactionTypeStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="text-center">
      <div className="mb-8">
        <p className="text-muted-foreground mb-2">
          Buying or selling a home can be both a <strong className="text-foreground">stressful</strong> and <strong className="text-foreground">exciting</strong> experience.
        </p>
        <p className="text-muted-foreground mb-2">
          Let us handle this <strong className="text-foreground">important moment</strong> for you.
        </p>
        <p className="text-muted-foreground mb-6">
          We are <strong className="text-foreground">HomePanel</strong>, a team which:
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="underline decoration-dotted underline-offset-4">is 2x faster than the national average,</li>
          <li className="underline decoration-dotted underline-offset-4">has learnt from 30,000+ transactions,</li>
          <li className="underline decoration-dotted underline-offset-4">offers the easiest client experience</li>
          <li className="underline decoration-dotted underline-offset-4">in the industry.</li>
        </ul>
      </div>
      
      <FormField label="What would you like a quote for?" className="text-center">
        <RadioCardGroup
          options={transactionTypes.map(t => ({ value: t.value, label: t.label }))}
          value={value}
          onChange={onChange}
          variant="pill"
          layout="horizontal"
          className="justify-center"
        />
      </FormField>
    </div>
  )
}

function PropertyAddressStep({
  transactionType,
  postcode,
  addressUnknown,
  addressData,
  onAddressChange,
  onPostcodeChange,
  onAddressUnknownChange,
}: {
  transactionType: string
  postcode: string
  addressUnknown: boolean
  addressData: AddressData | null
  onAddressChange: (address: AddressData | null) => void
  onPostcodeChange: (postcode: string) => void
  onAddressUnknownChange: (checked: boolean) => void
}) {
  const action = transactionType === "selling" ? "selling" : "buying"
  
  return (
    <div className="space-y-6">
      <StepHeader
        title={`What is the address of the property you are ${action}?`}
      />
      
      <FormField>
        <AddressAutocomplete
          value={addressData}
          onChange={onAddressChange}
          onPostcodeChange={onPostcodeChange}
          placeholder="Start typing postcode..."
          disabled={addressUnknown}
        />
      </FormField>
      
      <div className="flex items-center gap-3">
        <Checkbox
          id="addressUnknown"
          checked={addressUnknown}
          onCheckedChange={(checked) => onAddressUnknownChange(checked as boolean)}
        />
        <label htmlFor="addressUnknown" className="text-sm text-muted-foreground cursor-pointer">
          I don&apos;t know it yet
        </label>
      </div>
    </div>
  )
}

function TenureStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Is it a Freehold or Leasehold property?" />
      
      <InfoBox>
        Most houses are <strong className="text-foreground">Freehold</strong> and most flats are <strong className="text-foreground">Leasehold</strong>. If you are buying through an Estate Agent they should be able to make you aware.
      </InfoBox>
      
      <RadioCardGroup
        options={tenureTypes.map(t => ({ value: t.value, label: t.label }))}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="horizontal"
      />
    </div>
  )
}

function PropertyValueStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="How much will you be paying (approximately)?" />
      
      <FormField>
        <TextInput
          prefix="£"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter amount"
        />
      </FormField>
    </div>
  )
}

function OwnerCountStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Including you, how many people will own this property?" />
      
      <RadioCardGroup
        options={ownerCountOptions.map(o => ({ value: o.value, label: o.label }))}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="horizontal"
      />
    </div>
  )
}

function FirstTimeBuyerStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Will this be the first property you have all ever owned?" />
      
      <InfoBox>
        You could be considered a first time buyer if you have never owned or part owned a property anywhere in the world. <strong className="text-foreground">If any of the new owners have then you should answer &quot;No&quot;.</strong>
      </InfoBox>
      
      <RadioCardGroup
        options={[
          { value: "yes", label: "Yes, we are all first time buyers" },
          { value: "no", label: "No" },
        ]}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="vertical"
      />
    </div>
  )
}

function PropertyCountStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="When your purchase completes how many properties will you all own?" />
      
      <RadioCardGroup
        options={propertyCountOptions.map(o => ({ value: o.value, label: o.label }))}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="vertical"
      />
    </div>
  )
}

function NewBuildStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Is this a new build property?" />
      
      <RadioCardGroup
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="horizontal"
      />
    </div>
  )
}

function MortgageStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Will you be getting a mortgage?" />
      
      <RadioCardGroup
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="horizontal"
      />
    </div>
  )
}

function CompanyPurchaseStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Are you buying under a company name?" />
      
      <InfoBox>
        This could be a limited company (LTD), partnership or any other company.
      </InfoBox>
      
      <RadioCardGroup
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No / I don't know" },
        ]}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="vertical"
      />
    </div>
  )
}

function GiftFundsStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Will someone be giving you money to help with the purchase?" />
      
      <InfoBox>
        This could be a friend or relative who is helping with the deposit or the price of the property. But this does not include anyone who will also be an owner of the property.
      </InfoBox>
      
      <RadioCardGroup
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No / I'm not sure" },
        ]}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="vertical"
      />
    </div>
  )
}

function BankFundsOnlyStep({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Will you be paying for the property using only funds in your bank account?" />
      
      <InfoBox>
        You only need to answer &quot;Yes&quot; if 100% of the funds for this property are coming from cash that someone already has.
        <br /><br />
        <strong className="text-foreground">Answer &quot;No&quot; if:</strong>
        <ul className="list-disc list-inside mt-2">
          <li>You are getting a mortgage.</li>
          <li>You are selling another property that will pay for this one.</li>
        </ul>
      </InfoBox>
      
      <RadioCardGroup
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No / I'm not sure" },
        ]}
        value={value}
        onChange={onChange}
        variant="pill"
        layout="vertical"
      />
    </div>
  )
}

function PersonalDetailsStep({
  values,
  errors,
  isSubmitting,
  onFieldChange,
}: {
  values: EnquiryFormData
  errors: Record<string, { message?: string }>
  isSubmitting: boolean
  onFieldChange: (field: keyof EnquiryFormData, value: string) => void
}) {
  return (
    <div className="space-y-6">
      <StepHeader title="Tell us about yourself" />
      
      <div className="space-y-4">
        <FormField label="First name" required error={errors.firstName?.message}>
          <TextInput
            value={values.firstName}
            onChange={(e) => onFieldChange("firstName", e.target.value)}
            placeholder="Enter your first name"
            disabled={isSubmitting}
            error={!!errors.firstName}
          />
        </FormField>
        
        <FormField label="Last name" required error={errors.lastName?.message}>
          <TextInput
            value={values.lastName}
            onChange={(e) => onFieldChange("lastName", e.target.value)}
            placeholder="Enter your last name"
            disabled={isSubmitting}
            error={!!errors.lastName}
          />
        </FormField>
        
        <FormField label="Email address" required error={errors.email?.message}>
          <TextInput
            type="email"
            value={values.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="Enter your email"
            disabled={isSubmitting}
            error={!!errors.email}
          />
        </FormField>
        
        <FormField label="Phone number" required error={errors.phone?.message}>
          <TextInput
            type="tel"
            value={values.phone}
            onChange={(e) => onFieldChange("phone", e.target.value)}
            placeholder="Enter your phone number"
            disabled={isSubmitting}
            error={!!errors.phone}
          />
        </FormField>
      </div>
    </div>
  )
}

function QuoteStep({
  values,
}: {
  values: EnquiryFormData
}) {
  const fees = calculateFees(values)
  
  return (
    <div className="text-center">
      <img src="/logo.svg" alt="HomePanel" className="w-12 h-12 mx-auto mb-4" />
      
      <h2 className="text-xl font-semibold mb-1">
        If you let us handle this
      </h2>
      <p className="text-xl font-semibold mb-6">
        journey for you
      </p>
      
      <p className="text-muted-foreground mb-2">
        Our fee for your {fees.transactionLabel} would be:
      </p>
      <p className="text-4xl font-bold mb-8">
        £{fees.total.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      
      {/* Fee breakdown */}
      <div className="text-left bg-muted/50 rounded-xl p-5 mb-8">
        <h3 className="font-medium mb-4 text-sm">Fee breakdown</h3>
        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Legal fee</span>
            <span className="font-medium">£{fees.legalFee}</span>
          </div>
          {fees.leaseholdSupplement > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leasehold supplement</span>
              <span className="font-medium">£{fees.leaseholdSupplement}</span>
            </div>
          )}
          {fees.newBuildFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">New build supplement</span>
              <span className="font-medium">£{fees.newBuildFee}</span>
            </div>
          )}
          {fees.companyFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company purchase</span>
              <span className="font-medium">£{fees.companyFee}</span>
            </div>
          )}
          {fees.giftFundsFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gift funds verification</span>
              <span className="font-medium">£{fees.giftFundsFee}</span>
            </div>
          )}
          <div className="flex justify-between pt-2.5 border-t border-border">
            <span className="text-muted-foreground">Subtotal (ex VAT)</span>
            <span className="font-medium">£{fees.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT (20%)</span>
            <span className="font-medium">£{fees.vat}</span>
          </div>
          <div className="flex justify-between pt-2.5 border-t border-border">
            <span className="text-muted-foreground">Disbursements</span>
            <span className="font-medium">£{fees.disbursements}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Searches {fees.searchFees > 0 ? `(£${fees.searchFees})` : "(n/a)"}, Land Registry {fees.landRegistryFee > 0 ? `(£${fees.landRegistryFee})` : "(n/a)"}, Bank transfer (£{fees.bankTransferFee})</span>
          </div>
          {fees.sdlt > 0 && (
            <div className="flex justify-between pt-2.5 border-t border-border">
              <span className="text-muted-foreground">
                SDLT{fees.isFTB ? " (First Time Buyer)" : fees.isAdditional ? " (+3% Additional)" : ""}
              </span>
              <span className="font-medium">£{fees.sdlt.toLocaleString("en-GB")}</span>
            </div>
          )}
          {fees.sdlt === 0 && fees.isFTB && (
            <div className="flex justify-between pt-2.5 border-t border-border">
              <span className="text-muted-foreground">SDLT (First Time Buyer relief)</span>
              <span className="font-medium text-green-600">£0</span>
            </div>
          )}
          <div className="flex justify-between pt-2.5 border-t border-border text-foreground">
            <span className="font-semibold">Total estimate</span>
            <span className="font-semibold">£{fees.total.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {fees.sdlt > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Excl. SDLT</span>
              <span>£{fees.totalExSDLT.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Agents */}
      <p className="text-muted-foreground mb-4">
        Your case would directly be handled by
      </p>
      
      <div className="flex items-center justify-center gap-6 mb-4">
        {agents.map((agent, index) => (
          <div key={agent.name} className="flex items-center gap-4">
            {index > 0 && (
              <span className="text-sm text-muted-foreground">or</span>
            )}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-2 overflow-hidden">
                <img 
                  src={agent.image} 
                  alt={agent.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="font-medium text-sm">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.role}</p>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-sm text-muted-foreground">
        Experts in their field.
      </p>
    </div>
  )
}

// ============================================================================
// FEEDBACK FORM
// ============================================================================

const feedbackReasons = [
  { id: "price", label: "Price too high" },
  { id: "timing", label: "Not ready to proceed yet" },
  { id: "comparison", label: "Comparing other law firms" },
  { id: "service", label: "Prefer a different service" },
  { id: "location", label: "Want a local solicitor" },
  { id: "recommendation", label: "Going with a recommendation" },
  { id: "other", label: "Other reason" },
]

function FeedbackForm({
  firstName,
  isSubmitting,
  feedbackSubmitted,
  onSubmit,
}: {
  firstName: string
  isSubmitting: boolean
  feedbackSubmitted: boolean
  onSubmit: (reasons: string[], otherReason?: string) => void
}) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [otherReason, setOtherReason] = useState("")

  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev => 
      prev.includes(reasonId) 
        ? prev.filter(r => r !== reasonId)
        : [...prev, reasonId]
    )
  }

  const handleSubmit = () => {
    onSubmit(selectedReasons, selectedReasons.includes("other") ? otherReason : undefined)
  }

  if (feedbackSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl mx-auto"
      >
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-foreground text-background flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Thank you for your feedback</h2>
          <p className="text-muted-foreground max-w-md mx-auto leading-relaxed mb-6">
            We appreciate you taking the time to share your thoughts. Your feedback helps us improve our services.
          </p>
          <p className="text-sm text-muted-foreground">
            If you change your mind, feel free to come back anytime. We&apos;d be happy to help with your conveyancing needs.
          </p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6">
          <StepHeader
            title={`We're sorry to see you go, ${firstName}`}
            description="Thank you for considering HomePanel. To help us improve, could you share why you decided not to proceed?"
            align="center"
          />

          <div className="space-y-3 mb-6">
            {feedbackReasons.map((reason) => (
              <CheckboxField
                key={reason.id}
                id={reason.id}
                label={reason.label}
                checked={selectedReasons.includes(reason.id)}
                onCheckedChange={() => toggleReason(reason.id)}
                variant="card"
              />
            ))}
          </div>

          {selectedReasons.includes("other") && (
            <FormField label="Please tell us more" className="mb-6">
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Your feedback helps us improve..."
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-foreground min-h-[100px] resize-none transition-all duration-200"
              />
            </FormField>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl flex-1 h-12"
              onClick={() => onSubmit([], undefined)}
              disabled={isSubmitting}
            >
              Skip feedback
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-foreground hover:bg-foreground/90 text-background flex-1 h-12"
              onClick={handleSubmit}
              disabled={isSubmitting || selectedReasons.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit feedback"
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

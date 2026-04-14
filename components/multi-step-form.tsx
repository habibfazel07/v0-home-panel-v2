"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ArrowRight, Check, Loader2, Home, Building2, RefreshCw, ArrowLeftRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  enquiryFormSchema,
  type EnquiryFormData,
} from "@/lib/form-schema"
import { cn } from "@/lib/utils"
import { AddressAutocomplete, type AddressData } from "@/components/forms"
import Link from "next/link"

// ============================================================================
// FEE CALCULATION
// ============================================================================

function calcLegalFee(propertyValue: number, transactionType: string): number {
  const isSale = transactionType === "selling"
  if (isSale) {
    if (propertyValue <= 250000) return 900
    if (propertyValue <= 500000) return 950
    if (propertyValue <= 750000) return 1200
    if (propertyValue <= 1000000) return 1900
    return 0
  }
  if (propertyValue <= 250000) return 995
  if (propertyValue <= 500000) return 1200
  if (propertyValue <= 750000) return 1400
  if (propertyValue <= 1000000) return 1700
  return 0
}

function calculateFees(data: Partial<EnquiryFormData>) {
  const propertyValue = parseFloat(data.propertyValue?.replace(/,/g, "") || "0")
  const transactionType = data.transactionType || "buying"
  const isLeasehold = data.tenure === "leasehold"
  const isNewBuild = data.isNewBuild === "yes"
  const isCompanyPurchase = data.isCompanyPurchase === "yes"
  const isPurchase = transactionType === "buying" || transactionType === "buying-selling"
  const isSale = transactionType === "selling"
  const isTBC = propertyValue > 1000000
  const legalFee = calcLegalFee(propertyValue, transactionType)
  const leaseholdSupplement = isLeasehold && isPurchase ? 450 : isLeasehold && isSale ? 250 : 0
  const newBuildFee = isNewBuild ? 350 : 0
  const companyFee = isCompanyPurchase ? 150 : 0
  const chapsFee = 45
  const searchFees = isPurchase ? 350 : 0
  const subtotal = legalFee + leaseholdSupplement + newBuildFee + companyFee
  const vat = Math.round(subtotal * 0.2)
  const disbursements = searchFees + chapsFee
  const total = subtotal + vat + disbursements
  return {
    legalFee, leaseholdSupplement, newBuildFee, companyFee,
    chapsFee, searchFees, subtotal, vat, disbursements, total, isTBC,
    transactionLabel:
      transactionType === "buying" ? "purchase" :
      transactionType === "selling" ? "sale" :
      transactionType === "buying-selling" ? "purchase & sale" :
      transactionType === "remortgage" ? "remortgage" : "transfer of equity"
  }
}

// ============================================================================
// STEP FLOW
// ============================================================================

type StepType =
  | "terms-conditions" | "transaction-type" | "property-address"
  | "property-value" | "tenure" | "first-time-buyer" | "property-count"
  | "new-build" | "mortgage" | "company-purchase" | "personal-details" | "quote"

function getStepsForTransaction(transactionType: string): StepType[] {
  const pre: StepType[] = ["terms-conditions", "transaction-type", "property-address", "property-value", "tenure"]
  if (transactionType === "buying" || transactionType === "buying-selling")
    return [...pre, "first-time-buyer", "property-count", "new-build", "mortgage", "company-purchase", "personal-details", "quote"]
  if (transactionType === "selling")
    return [...pre, "mortgage", "personal-details", "quote"]
  if (transactionType === "remortgage")
    return [...pre, "personal-details", "quote"]
  if (transactionType === "transfer-equity")
    return [...pre, "mortgage", "personal-details", "quote"]
  return pre
}

// ============================================================================
// OPTION BUTTON
// ============================================================================

function Option({ label, sublabel, selected, onClick, icon }: {
  label: string
  sublabel?: string
  selected: boolean
  onClick: () => void
  icon?: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative w-full text-left px-6 py-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4",
        selected
          ? "border-white bg-white/10 text-white"
          : "border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/8 hover:text-white"
      )}
    >
      {icon && (
        <div className={cn("flex-shrink-0 transition-colors", selected ? "text-white" : "text-white/40 group-hover:text-white/60")}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-base">{label}</div>
        {sublabel && <div className="text-sm mt-0.5 opacity-60">{sublabel}</div>}
      </div>
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
        selected ? "border-white bg-white" : "border-white/30"
      )}>
        {selected && <div className="w-2 h-2 rounded-full bg-black" />}
      </div>
    </motion.button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MultiStepForm() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addressData, setAddressData] = useState<AddressData | null>(null)
  const [direction, setDirection] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm<EnquiryFormData>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      termsAccepted: false, transactionType: "",
      propertyAddressLine1: "", propertyAddressLine2: "",
      propertyCity: "", propertyPostcode: "",
      propertyAddressUnknown: false, tenure: "", propertyValue: "",
      ownerCount: "", firstTimeBuyer: "", propertyCount: "",
      isNewBuild: "", hasMortgage: "", isCompanyPurchase: "",
      hasGiftFunds: "", bankFundsOnly: "",
      firstName: "", lastName: "", email: "", phone: "",
    },
    mode: "onChange",
  })

  const { handleSubmit, watch, setValue, formState: { errors }, trigger } = form
  const watchedValues = watch()
  const steps = useMemo(() => getStepsForTransaction(watchedValues.transactionType), [watchedValues.transactionType])
  const currentStep = steps[currentStepIndex] || "terms-conditions"
  const totalSteps = steps.length || 1
  const progress = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 400)
  }, [currentStep])

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    switch (currentStep) {
      case "terms-conditions": return watchedValues.termsAccepted === true
      case "transaction-type": return !!watchedValues.transactionType
      case "property-address": return watchedValues.propertyAddressUnknown || (!!watchedValues.propertyPostcode && watchedValues.propertyPostcode.length >= 5)
      case "tenure": return !!watchedValues.tenure
      case "property-value": return !!watchedValues.propertyValue
      case "first-time-buyer": return !!watchedValues.firstTimeBuyer
      case "property-count": return !!watchedValues.propertyCount
      case "new-build": return !!watchedValues.isNewBuild
      case "mortgage": return !!watchedValues.hasMortgage
      case "company-purchase": return !!watchedValues.isCompanyPurchase
      case "personal-details": return await trigger(["firstName", "lastName", "email", "phone"])
      default: return true
    }
  }, [currentStep, watchedValues, trigger])

  const nextStep = useCallback(async () => {
    const isValid = await validateCurrentStep()
    if (isValid && currentStepIndex < steps.length - 1) {
      setDirection(1)
      setCurrentStepIndex(prev => prev + 1)
    }
  }, [validateCurrentStep, currentStepIndex, steps.length])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setDirection(-1)
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentStep !== "personal-details" && currentStep !== "property-address" && currentStep !== "property-value") {
      await nextStep()
    }
  }, [nextStep, currentStep])

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

  const handleDecline = async () => {
    setShowFeedbackForm(true)
    try {
      await fetch("/api/enquiry/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: watchedValues.firstName, lastName: watchedValues.lastName, email: watchedValues.email }),
      })
    } catch {}
  }

  const handleFeedbackSubmit = async (reasons: string[], otherReason?: string) => {
    setIsSubmitting(true)
    try {
      await fetch("/api/enquiry/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: watchedValues.firstName, lastName: watchedValues.lastName, email: watchedValues.email, reasons, otherReason, quoteAmount: calculateFees(watchedValues).total }),
      })
      setFeedbackSubmitted(true)
    } catch { setFeedbackSubmitted(true) }
    finally { setIsSubmitting(false) }
  }

  const variants = {
    enter: (d: number) => ({ opacity: 0, y: d > 0 ? 40 : -40 }),
    center: { opacity: 1, y: 0 },
    exit: (d: number) => ({ opacity: 0, y: d > 0 ? -40 : 40 }),
  }

  // SUCCESS
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-8">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-semibold text-white mb-4 tracking-tight">Enquiry submitted</h2>
          <p className="text-white/50 leading-relaxed text-lg">A member of The Home Panel team will be in touch within one business day.</p>
          <Link href="/" className="inline-flex items-center gap-2 mt-10 text-white/40 hover:text-white/70 transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" /> Back to homepage
          </Link>
        </motion.div>
      </div>
    )
  }

  // FEEDBACK
  if (showFeedbackForm) {
    if (feedbackSubmitted) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center px-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-3">Thank you</h2>
            <p className="text-white/40">Your feedback helps us improve.</p>
          </motion.div>
        </div>
      )
    }
    const feedbackReasons = [
      { id: "price", label: "Price too high" },
      { id: "timing", label: "Not ready yet" },
      { id: "comparison", label: "Comparing other firms" },
      { id: "location", label: "Want a local solicitor" },
      { id: "recommendation", label: "Going with a recommendation" },
      { id: "other", label: "Other reason" },
    ]
    const [selectedReasons, setSelectedReasons] = useState<string[]>([])
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <h2 className="text-2xl font-semibold text-white mb-2">We're sorry to see you go</h2>
          <p className="text-white/40 mb-8">Could you tell us why you decided not to proceed?</p>
          <div className="space-y-3 mb-8">
            {feedbackReasons.map(r => (
              <Option key={r.id} label={r.label} selected={selectedReasons.includes(r.id)}
                onClick={() => setSelectedReasons(prev => prev.includes(r.id) ? prev.filter(x => x !== r.id) : [...prev, r.id])} />
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => handleFeedbackSubmit([])} className="flex-1 py-4 rounded-2xl border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-all text-sm">Skip</button>
            <button type="button" onClick={() => handleFeedbackSubmit(selectedReasons)} disabled={selectedReasons.length === 0 || isSubmitting}
              className="flex-1 py-4 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition-all text-sm disabled:opacity-40">
              {isSubmitting ? "Submitting..." : "Submit feedback"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const fees = calculateFees(watchedValues)

  return (
    <div className="min-h-screen bg-black relative overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Background image — subtle */}
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80&fit=crop"
          className="w-full h-full object-cover opacity-10" style={{ filter: "grayscale(100%)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="The Home Panel" className="w-7 h-7" />
          <span className="text-white/70 text-sm font-medium">The Home Panel</span>
        </Link>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={cn(
              "rounded-full transition-all duration-300",
              i === currentStepIndex ? "w-6 h-1.5 bg-white" :
              i < currentStepIndex ? "w-1.5 h-1.5 bg-white/50" :
              "w-1.5 h-1.5 bg-white/20"
            )} />
          ))}
        </div>

        {/* Back button */}
        <button type="button" onClick={prevStep} disabled={currentStepIndex === 0}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm disabled:opacity-0">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Step content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 pb-24">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >

              {/* TERMS */}
              {currentStep === "terms-conditions" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Before we begin</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Your privacy matters</h1>
                  <p className="text-white/50 text-lg mb-10 leading-relaxed">We'll only use your information to prepare your conveyancing quote and manage your case.</p>
                  <div onClick={() => setValue("termsAccepted", !watchedValues.termsAccepted)}
                    className={cn("flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all mb-6",
                      watchedValues.termsAccepted ? "border-white bg-white/10" : "border-white/20 bg-white/5 hover:border-white/40")}>
                    <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      watchedValues.termsAccepted ? "border-white bg-white" : "border-white/30")}>
                      {watchedValues.termsAccepted && <Check className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <span className="text-white text-sm leading-relaxed">
                      I agree to The Home Panel's Terms & Conditions and Privacy Policy
                    </span>
                  </div>
                  <p className="text-white/30 text-xs text-center">
                    <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-white/50 transition-colors">Terms & Conditions</Link>
                    {" · "}
                    <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-white/50 transition-colors">Privacy Policy</Link>
                  </p>
                </div>
              )}

              {/* TRANSACTION TYPE */}
              {currentStep === "transaction-type" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Step 1</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">What are you looking to do?</h1>
                  <p className="text-white/50 text-lg mb-10">Select the type of transaction you need help with.</p>
                  <div className="space-y-3">
                    <Option label="Buying a property" sublabel="Residential purchase" selected={watchedValues.transactionType === "buying"} onClick={() => { setValue("transactionType", "buying"); setTimeout(nextStep, 300) }} icon={<Home className="w-5 h-5" />} />
                    <Option label="Selling a property" sublabel="Residential sale" selected={watchedValues.transactionType === "selling"} onClick={() => { setValue("transactionType", "selling"); setTimeout(nextStep, 300) }} icon={<Building2 className="w-5 h-5" />} />
                    <Option label="Buying & selling" sublabel="Both at the same time" selected={watchedValues.transactionType === "buying-selling"} onClick={() => { setValue("transactionType", "buying-selling"); setTimeout(nextStep, 300) }} icon={<ArrowLeftRight className="w-5 h-5" />} />
                    <Option label="Remortgage" sublabel="Switch or renew your mortgage" selected={watchedValues.transactionType === "remortgage"} onClick={() => { setValue("transactionType", "remortgage"); setTimeout(nextStep, 300) }} icon={<RefreshCw className="w-5 h-5" />} />
                    <Option label="Transfer of equity" sublabel="Change ownership of a property" selected={watchedValues.transactionType === "transfer-equity"} onClick={() => { setValue("transactionType", "transfer-equity"); setTimeout(nextStep, 300) }} icon={<ArrowLeftRight className="w-5 h-5" />} />
                  </div>
                </div>
              )}

              {/* PROPERTY ADDRESS */}
              {currentStep === "property-address" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Step 2</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">
                    {watchedValues.transactionType === "selling" ? "What's the address of the property you're selling?" : "What's the property address?"}
                  </h1>
                  <p className="text-white/50 text-lg mb-10">Start typing the postcode to search.</p>
                  <div className="space-y-4">
                    <div className="[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder-white/30 [&_input:focus]:border-white/60 [&_input]:rounded-2xl [&_input]:py-4 [&_input]:px-5 [&_input]:text-base">
                      <AddressAutocomplete
                        value={addressData}
                        onChange={(address) => {
                          setAddressData(address)
                          if (address) {
                            setValue("propertyAddressLine1", address.addressLine1)
                            setValue("propertyAddressLine2", address.addressLine2)
                            setValue("propertyCity", address.city)
                            setValue("propertyPostcode", address.postcode)
                          }
                        }}
                        onPostcodeChange={(postcode) => setValue("propertyPostcode", postcode)}
                        placeholder="Start typing postcode..."
                        disabled={watchedValues.propertyAddressUnknown}
                      />
                    </div>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setValue("propertyAddressUnknown", !watchedValues.propertyAddressUnknown)}>
                      <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        watchedValues.propertyAddressUnknown ? "border-white bg-white" : "border-white/30")}>
                        {watchedValues.propertyAddressUnknown && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <span className="text-white/50 text-sm">I don't know the address yet</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PROPERTY VALUE */}
              {currentStep === "property-value" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Step 3</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">What's the property value?</h1>
                  <p className="text-white/50 text-lg mb-10">An estimate is fine at this stage.</p>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40 text-xl font-medium">£</span>
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={watchedValues.propertyValue}
                      onChange={(e) => setValue("propertyValue", e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && nextStep()}
                      placeholder="350,000"
                      className="w-full bg-white/10 border-2 border-white/20 text-white placeholder-white/20 rounded-2xl py-5 pl-10 pr-5 text-2xl font-medium focus:outline-none focus:border-white/60 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* TENURE */}
              {currentStep === "tenure" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Step 4</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Is it freehold or leasehold?</h1>
                  <p className="text-white/50 text-lg mb-10">Most houses are freehold. Most flats are leasehold. Your estate agent can confirm.</p>
                  <div className="space-y-3">
                    <Option label="Freehold" sublabel="You own the building and land" selected={watchedValues.tenure === "freehold"} onClick={() => { setValue("tenure", "freehold"); setTimeout(nextStep, 300) }} />
                    <Option label="Leasehold" sublabel="You own the property for a set period" selected={watchedValues.tenure === "leasehold"} onClick={() => { setValue("tenure", "leasehold"); setTimeout(nextStep, 300) }} />
                    <Option label="Not sure" sublabel="We'll confirm during onboarding" selected={watchedValues.tenure === "unsure"} onClick={() => { setValue("tenure", "unsure"); setTimeout(nextStep, 300) }} />
                  </div>
                </div>
              )}

              {/* FIRST TIME BUYER */}
              {currentStep === "first-time-buyer" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Almost there</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Is this your first property?</h1>
                  <p className="text-white/50 text-lg mb-10">You're a first time buyer if none of the new owners have ever owned property anywhere in the world.</p>
                  <div className="space-y-3">
                    <Option label="Yes, first time buyer" sublabel="None of us have owned property before" selected={watchedValues.firstTimeBuyer === "yes"} onClick={() => { setValue("firstTimeBuyer", "yes"); setTimeout(nextStep, 300) }} />
                    <Option label="No" sublabel="One or more of us have owned property before" selected={watchedValues.firstTimeBuyer === "no"} onClick={() => { setValue("firstTimeBuyer", "no"); setTimeout(nextStep, 300) }} />
                  </div>
                </div>
              )}

              {/* PROPERTY COUNT */}
              {currentStep === "property-count" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Almost there</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">How many properties will you own after this purchase?</h1>
                  <p className="text-white/50 text-lg mb-10">Including this one, across all owners.</p>
                  <div className="space-y-3">
                    <Option label="Just this one" sublabel="This will be our only property" selected={watchedValues.propertyCount === "one"} onClick={() => { setValue("propertyCount", "one"); setTimeout(nextStep, 300) }} />
                    <Option label="More than one" sublabel="We'll own additional properties" selected={watchedValues.propertyCount === "more-than-one"} onClick={() => { setValue("propertyCount", "more-than-one"); setTimeout(nextStep, 300) }} />
                  </div>
                </div>
              )}

              {/* NEW BUILD */}
              {currentStep === "new-build" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Almost there</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Is this a new build?</h1>
                  <p className="text-white/50 text-lg mb-10">A property being built or recently completed by a developer.</p>
                  <div className="space-y-3">
                    <Option label="Yes, new build" selected={watchedValues.isNewBuild === "yes"} onClick={() => { setValue("isNewBuild", "yes"); setTimeout(nextStep, 300) }} />
                    <Option label="No" selected={watchedValues.isNewBuild === "no"} onClick={() => { setValue("isNewBuild", "no"); setTimeout(nextStep, 300) }} />
                  </div>
                </div>
              )}

              {/* MORTGAGE */}
              {currentStep === "mortgage" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Almost there</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Will you be using a mortgage?</h1>
                  <p className="text-white/50 text-lg mb-10">This helps us understand the complexity of your transaction.</p>
                  <div className="space-y-3">
                    <Option label="Yes, with a mortgage" selected={watchedValues.hasMortgage === "yes"} onClick={() => { setValue("hasMortgage", "yes"); setTimeout(nextStep, 300) }} />
                    <Option label="No, cash purchase" selected={watchedValues.hasMortgage === "no"} onClick={() => { setValue("hasMortgage", "no"); setTimeout(nextStep, 300) }} />
                  </div>
                </div>
              )}

              {/* COMPANY PURCHASE */}
              {currentStep === "company-purchase" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">One more</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Are you buying under a company name?</h1>
                  <p className="text-white/50 text-lg mb-10">This includes limited companies, partnerships, or any other business entity.</p>
                  <div className="space-y-3">
                    <Option label="Yes, company purchase" selected={watchedValues.isCompanyPurchase === "yes"} onClick={() => { setValue("isCompanyPurchase", "yes"); setTimeout(nextStep, 300) }} />
                    <Option label="No, personal purchase" selected={watchedValues.isCompanyPurchase === "no"} onClick={() => { setValue("isCompanyPurchase", "no"); setTimeout(nextStep, 300) }} />
                  </div>
                </div>
              )}

              {/* PERSONAL DETAILS */}
              {currentStep === "personal-details" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Final step</p>
                  <h1 className="text-4xl font-semibold text-white mb-3 tracking-tight">Tell us about yourself</h1>
                  <p className="text-white/50 text-lg mb-10">We'll use these details to send your quote and get in touch.</p>
                  <div className="space-y-4">
                    {[
                      { field: "firstName" as const, label: "First name", type: "text", placeholder: "Habib" },
                      { field: "lastName" as const, label: "Last name", type: "text", placeholder: "Fazel" },
                      { field: "email" as const, label: "Email address", type: "email", placeholder: "habib@example.com" },
                      { field: "phone" as const, label: "Phone number", type: "tel", placeholder: "07700 000000" },
                    ].map(({ field, label, type, placeholder }) => (
                      <div key={field}>
                        <label className="block text-white/40 text-xs uppercase tracking-widest mb-2">{label}</label>
                        <input
                          type={type}
                          value={watchedValues[field] as string}
                          onChange={(e) => setValue(field, e.target.value)}
                          placeholder={placeholder}
                          className={cn(
                            "w-full bg-white/10 border-2 text-white placeholder-white/20 rounded-2xl py-4 px-5 text-base focus:outline-none transition-colors",
                            errors[field] ? "border-red-500/60" : "border-white/20 focus:border-white/60"
                          )}
                        />
                        {errors[field] && <p className="text-red-400 text-xs mt-1.5">{errors[field]?.message}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* QUOTE */}
              {currentStep === "quote" && (
                <div>
                  <p className="text-white/40 text-sm uppercase tracking-widest mb-4">Your quote</p>
                  <h1 className="text-4xl font-semibold text-white mb-2 tracking-tight">
                    {fees.isTBC ? "We'll be in touch" : `£${fees.total.toLocaleString("en-GB")}`}
                  </h1>
                  <p className="text-white/50 text-lg mb-8">
                    {fees.isTBC ? "Properties over £1m are quoted on application." : `Fixed fee for your ${fees.transactionLabel}`}
                  </p>

                  {!fees.isTBC && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Legal fee (ex VAT)</span>
                        <span className="text-white">£{fees.legalFee.toLocaleString("en-GB")}</span>
                      </div>
                      {fees.leaseholdSupplement > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Leasehold supplement</span>
                          <span className="text-white">£{fees.leaseholdSupplement.toLocaleString("en-GB")}</span>
                        </div>
                      )}
                      {fees.newBuildFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">New build supplement</span>
                          <span className="text-white">£{fees.newBuildFee.toLocaleString("en-GB")}</span>
                        </div>
                      )}
                      {fees.companyFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Company purchase</span>
                          <span className="text-white">£{fees.companyFee.toLocaleString("en-GB")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-3 border-t border-white/10">
                        <span className="text-white/50">VAT (20%)</span>
                        <span className="text-white">£{fees.vat.toLocaleString("en-GB")}</span>
                      </div>
                      {fees.searchFees > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Searches</span>
                          <span className="text-white">£{fees.searchFees.toLocaleString("en-GB")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">CHAPS fee</span>
                        <span className="text-white">£{fees.chapsFee.toLocaleString("en-GB")}</span>
                      </div>
                      <div className="flex justify-between text-base pt-3 border-t border-white/20 font-semibold">
                        <span className="text-white">Total estimate</span>
                        <span className="text-white">£{fees.total.toLocaleString("en-GB")}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-white/30 text-xs mb-8">Stamp Duty Land Tax (SDLT) is not included — it's a government tax paid directly to HMRC. Your solicitor will advise on the exact amount.</p>

                  <div className="space-y-3">
                    <motion.button
                      type="button"
                      onClick={handleSubmit(onSubmit)}
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full bg-white text-black font-semibold py-5 rounded-2xl text-base hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Proceed with The Home Panel <ArrowRight className="w-4 h-4" /></>}
                    </motion.button>
                    <button type="button" onClick={handleDecline} className="w-full py-4 text-white/30 hover:text-white/60 transition-colors text-sm">
                      No thanks
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Continue button — for steps that don't auto-advance */}
          {currentStep !== "quote" && currentStep !== "transaction-type" && currentStep !== "tenure" && currentStep !== "first-time-buyer" && currentStep !== "property-count" && currentStep !== "new-build" && currentStep !== "mortgage" && currentStep !== "company-purchase" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10"
            >
              {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
              <motion.button
                type="button"
                onClick={nextStep}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-white text-black font-semibold py-5 rounded-2xl text-base hover:bg-white/90 transition-all flex items-center justify-center gap-2"
              >
                {currentStep === "personal-details" ? "Get my quote" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <p className="text-center text-white/20 text-xs mt-4">Press Enter ↵ to continue</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bottom progress bar */}
      <div className="fixed bottom-0 left-0 right-0 h-0.5 bg-white/10 z-20">
        <motion.div
          className="h-full bg-white"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

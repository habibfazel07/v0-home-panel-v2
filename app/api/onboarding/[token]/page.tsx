"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  CheckCircle2, 
  Upload, 
  ShieldCheck, 
  Building2, 
  FileText, 
  ArrowRight,
  Loader2,
  User,
  ExternalLink,
  Check,
  AlertCircle,
  Clock,
  X,
  Info
} from "lucide-react"

interface ComplianceCheck {
  id: string
  check_type: string
  provider: string
  status: string
  completed_at?: string
  summary_json?: Record<string, unknown>
}

interface FirmBranding {
  id: string
  name: string
  brand_color?: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
}

interface EnquiryData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  property_address: string
  transaction_type: string
  case_reference: string
  onboarding_status: string
  assigned_firm_id?: string
  firm?: FirmBranding
  onboarding_data: {
    personal_details?: {
      date_of_birth?: string
      current_address?: string
      ni_number?: string
    }
    id_verification?: {
      started?: boolean
      completed?: boolean
      completed_at?: string
    }
    source_of_funds?: {
      started?: boolean
      completed?: boolean
      completed_at?: string
    }
    documents?: {
      uploaded: { name: string; type: string; url: string }[]
    }
    submitted_at?: string
  } | null
  compliance_checks?: ComplianceCheck[]
}

type OnboardingStep = "welcome" | "personal" | "id-verification" | "source-of-funds" | "documents" | "review" | "complete"

const steps = [
  { id: "personal" as const, label: "Details", icon: User },
  { id: "id-verification" as const, label: "Identity", icon: ShieldCheck },
  { id: "source-of-funds" as const, label: "Funds", icon: Building2 },
  { id: "documents" as const, label: "Documents", icon: FileText },
  { id: "review" as const, label: "Submit", icon: CheckCircle2 },
]

const DOCUMENT_TYPES = [
  { id: "proof_of_address", label: "Proof of Address", description: "Utility bill or bank statement (dated within 3 months)", required: true },
  { id: "bank_statement", label: "Bank Statement", description: "Showing funds for the transaction", required: true },
  { id: "payslip", label: "Recent Payslip", description: "If employed, from the last 3 months", required: false },
  { id: "gifted_deposit_letter", label: "Gifted Deposit Letter", description: "Only if receiving gift funds", required: false },
]

export default function OnboardingPage() {
  const params = useParams()
  const token = params.token as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [enquiry, setEnquiry] = useState<EnquiryData | null>(null)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [tokenError, setTokenError] = useState<"invalid" | "expired" | null>(null)
  
  const [formData, setFormData] = useState({
    date_of_birth: "",
    current_address: "",
    ni_number: "",
  })
  
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; type: string; url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)

  const fetchEnquiry = useCallback(async () => {
    try {
      const res = await fetch(`/api/onboarding/${token}`)
      if (!res.ok) {
        const data = await res.json()
        if (data.error?.includes("expired")) {
          setTokenError("expired")
        } else {
          setTokenError("invalid")
        }
        throw new Error(data.error || "Invalid or expired link")
      }
      const data = await res.json()
      setEnquiry(data.enquiry)
      
      // Restore form data
      if (data.enquiry.onboarding_data?.personal_details) {
        setFormData({
          date_of_birth: data.enquiry.onboarding_data.personal_details.date_of_birth || "",
          current_address: data.enquiry.onboarding_data.personal_details.current_address || "",
          ni_number: data.enquiry.onboarding_data.personal_details.ni_number || "",
        })
      }
      
      // Restore uploaded docs
      if (data.enquiry.onboarding_data?.documents?.uploaded) {
        setUploadedDocs(data.enquiry.onboarding_data.documents.uploaded)
      }
      
      // Determine current step based on progress
      determineCurrentStep(data.enquiry)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchEnquiry()
  }, [fetchEnquiry])

  const determineCurrentStep = (enq: EnquiryData) => {
    if (enq.onboarding_status === "completed" || enq.onboarding_data?.submitted_at) {
      setCurrentStep("complete")
    } else if (enq.onboarding_data?.documents?.uploaded?.length && enq.onboarding_data?.source_of_funds?.completed) {
      setCurrentStep("review")
    } else if (enq.onboarding_data?.source_of_funds?.completed) {
      setCurrentStep("documents")
    } else if (enq.onboarding_data?.id_verification?.completed) {
      setCurrentStep("source-of-funds")
    } else if (enq.onboarding_data?.personal_details) {
      setCurrentStep("id-verification")
    }
  }

  const saveProgress = async (step: string, data: Record<string, unknown>) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to save progress")
      }
      await fetchEnquiry()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
      return false
    } finally {
      setSaving(false)
    }
  }

  const handlePersonalSubmit = async () => {
    if (!formData.date_of_birth || !formData.current_address) {
      setError("Please fill in all required fields")
      return
    }
    const success = await saveProgress("personal_details", formData)
    if (success) {
      setSuccessMessage("Personal details saved")
      setTimeout(() => setSuccessMessage(null), 2000)
      setCurrentStep("id-verification")
    }
  }

  const handleStartIdVerification = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/onboarding/credas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, checkType: "aml" }),
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to start identity verification")
      }
      
      const data = await res.json()
      await saveProgress("id_verification", { started: true, started_at: new Date().toISOString(), provider: "credas" })
      
      // Open Credas identity / AML journey in new tab
      const url = data.inviteUrl || data.url
      if (url) {
        window.open(url, "_blank")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start verification")
    } finally {
      setSaving(false)
    }
  }

  const handleIdVerificationComplete = async () => {
    const success = await saveProgress("id_verification", { 
      started: true,
      completed: true, 
      completed_at: new Date().toISOString(),
      provider: "credas"
    })
    if (success) {
      setSuccessMessage("Identity verification marked as complete")
      setTimeout(() => setSuccessMessage(null), 2000)
      setCurrentStep("source-of-funds")
    }
  }

  const handleStartSourceOfFunds = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/onboarding/credas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, checkType: "source_of_funds" }),
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to start source of funds check")
      }
      
      const data = await res.json()
      await saveProgress("source_of_funds", { started: true, started_at: new Date().toISOString(), provider: "credas" })
      
      // Open Credas source of funds journey in new tab
      const url = data.inviteUrl || data.url
      if (url) {
        window.open(url, "_blank")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start verification")
    } finally {
      setSaving(false)
    }
  }

  const handleSourceOfFundsComplete = async () => {
    const success = await saveProgress("source_of_funds", { 
      started: true,
      completed: true, 
      completed_at: new Date().toISOString(),
      provider: "credas"
    })
    if (success) {
      setSuccessMessage("Source of funds verification marked as complete")
      setTimeout(() => setSuccessMessage(null), 2000)
      setCurrentStep("documents")
    }
  }

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    setUploadingType(docType)
    setError(null)
    
    try {
      const formDataObj = new FormData()
      formDataObj.append("file", file)
      formDataObj.append("token", token)
      formDataObj.append("documentType", docType)
      
      const res = await fetch("/api/onboarding/upload", {
        method: "POST",
        body: formDataObj,
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Upload failed")
      }
      
      const data = await res.json()
      const newDoc = { name: file.name, type: docType, url: data.url }
      const newDocs = [...uploadedDocs.filter(d => d.type !== docType), newDoc]
      setUploadedDocs(newDocs)
      await saveProgress("documents", { uploaded: newDocs })
      setSuccessMessage(`${file.name} uploaded successfully`)
      setTimeout(() => setSuccessMessage(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      setUploadingType(null)
      e.target.value = ""
    }
  }

  const handleRemoveDocument = async (docType: string) => {
    const newDocs = uploadedDocs.filter(d => d.type !== docType)
    setUploadedDocs(newDocs)
    await saveProgress("documents", { uploaded: newDocs })
  }

  const handleSubmitOnboarding = async () => {
    const requiredDocs = DOCUMENT_TYPES.filter(d => d.required)
    const uploadedTypes = uploadedDocs.map(d => d.type)
    const missingRequired = requiredDocs.filter(d => !uploadedTypes.includes(d.id))
    
    if (missingRequired.length > 0) {
      setError(`Please upload required documents: ${missingRequired.map(d => d.label).join(", ")}`)
      return
    }
    
    const success = await saveProgress("submit", { submitted_at: new Date().toISOString() })
    if (success) {
      setCurrentStep("complete")
    }
  }

  const getStepStatus = (stepId: typeof steps[number]["id"]): "complete" | "current" | "upcoming" => {
    const stepIndex = steps.findIndex(s => s.id === stepId)
    const currentIndex = steps.findIndex(s => s.id === currentStep)
    
    if (currentStep === "welcome") return "upcoming"
    if (currentStep === "complete") return "complete"
    if (stepIndex < currentIndex) return "complete"
    if (stepIndex === currentIndex) return "current"
    return "upcoming"
  }

  const getDocumentStatus = (docType: string) => {
    return uploadedDocs.find(d => d.type === docType)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading your onboarding...</p>
        </div>
      </div>
    )
  }

  // Token error state
  if (tokenError || !enquiry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">
            {tokenError === "expired" ? "Link Expired" : "Invalid Link"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {tokenError === "expired" 
              ? "This onboarding link has expired. Please contact your conveyancer to request a new link."
              : "This onboarding link is not valid. Please check the link or contact your conveyancer for assistance."
            }
          </p>
          <div className="mt-6 p-4 bg-muted rounded-xl">
            <p className="text-xs text-muted-foreground">
              Need help? Contact support at<br />
              <a href="mailto:support@homepanel.co.uk" className="text-foreground font-medium">support@homepanel.co.uk</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Get firm branding colors
  const firmColor = enquiry.firm?.brand_color || "#1a1a1a"
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header - with firm branding if available */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {enquiry.firm?.logo_url ? (
              <img 
                src={enquiry.firm.logo_url} 
                alt={enquiry.firm.name} 
                className="h-8 w-auto object-contain"
              />
            ) : (
              <>
                <img src="/logo.svg" alt="HomePanel" className="w-8 h-8" />
                <span className="font-semibold text-sm">{enquiry.firm?.name || "HomePanel"}</span>
              </>
            )}
            {enquiry.firm?.logo_url && (
              <span className="font-semibold text-sm">{enquiry.firm.name}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {enquiry.first_name} {enquiry.last_name}
            </span>
            <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              {enquiry.case_reference || enquiry.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* Success/Error toast */}
      {(successMessage || error) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
            successMessage ? "bg-accent text-white" : "bg-destructive text-white"
          }`}>
            {successMessage ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="text-sm font-medium">{successMessage || error}</span>
            <button onClick={() => { setSuccessMessage(null); setError(null) }} className="ml-2">
              <X className="h-4 w-4 opacity-70 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 py-10">
        {/* Progress indicator */}
        {currentStep !== "welcome" && currentStep !== "complete" && (
          <nav className="mb-10">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id)
                return (
                  <li key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center w-full">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        status === "complete" ? "bg-accent text-white" :
                        status === "current" ? "bg-foreground text-background ring-4 ring-foreground/10" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {status === "complete" ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <step.icon className="h-5 w-5" />
                        )}
                      </div>
                      <span className={`mt-2 text-xs font-medium text-center ${
                        status === "current" ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 w-full mx-2 -mt-6 ${
                        getStepStatus(steps[index + 1].id) !== "upcoming" ? "bg-accent" : "bg-border"
                      }`} />
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        )}

        {/* Welcome */}
        {currentStep === "welcome" && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight mb-3">
                Welcome, {enquiry.first_name}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Complete your onboarding to proceed with your property transaction. This typically takes about 10 minutes.
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Your Property</p>
                <p className="font-medium">{enquiry.property_address || "Address to be confirmed"}</p>
              </div>
              <div className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">Transaction Type</p>
                <p className="font-medium capitalize">{enquiry.transaction_type?.replace(/-/g, " ")}</p>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-2xl p-6 space-y-4">
              <p className="text-sm font-semibold">What you'll need</p>
              <ul className="space-y-3">
                {[
                  { icon: ShieldCheck, text: "Valid passport or driving licence for ID verification" },
                  { icon: Building2, text: "Access to your online banking for source of funds check" },
                  { icon: FileText, text: "Proof of address document (utility bill or bank statement)" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground pt-1.5">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
              onClick={() => setCurrentStep("personal")}
            >
              Start Onboarding
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <p className="text-center text-xs text-muted-foreground">
              Your information is encrypted and securely stored
            </p>
          </div>
        )}

        {/* Personal Details */}
        {currentStep === "personal" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Personal Details</h1>
              <p className="text-muted-foreground text-sm">Please confirm your information</p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">First Name</Label>
                  <div className="h-12 px-4 flex items-center bg-muted rounded-xl text-sm font-medium">
                    {enquiry.first_name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Last Name</Label>
                  <div className="h-12 px-4 flex items-center bg-muted rounded-xl text-sm font-medium">
                    {enquiry.last_name}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dob" className="text-sm font-medium">
                  Date of Birth <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium">
                  Current Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="Enter your full current address"
                  value={formData.current_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_address: e.target.value }))}
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ni" className="text-sm font-medium">
                  National Insurance Number <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="ni"
                  placeholder="e.g. QQ 12 34 56 C"
                  value={formData.ni_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, ni_number: e.target.value.toUpperCase() }))}
                  className="h-12 rounded-xl font-mono"
                />
              </div>
            </div>

            <Button 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
              onClick={handlePersonalSubmit}
              disabled={saving || !formData.date_of_birth || !formData.current_address}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
            </Button>
          </div>
        )}

        {/* ID Verification - Armalytix */}
        {currentStep === "id-verification" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Identity Verification</h1>
              <p className="text-muted-foreground text-sm">Verify your identity securely with Armalytix</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-7 w-7 text-[#6366F1]" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Armalytix Identity Service</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Armalytix is our trusted partner for secure identity verification. You&apos;ll verify using your passport or driving licence.
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium">What happens next:</p>
                <ol className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    Click the button below to open Armalytix in a new window
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    Follow the instructions to verify your ID document
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    Return here and click &quot;I&apos;ve completed verification&quot;
                  </li>
                </ol>
              </div>

              <Button 
                variant="outline"
                className="w-full h-12 rounded-xl font-medium"
                onClick={handleStartIdVerification}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Open Armalytix Identity Verification
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Your identity verification is reviewed by our compliance team. This typically takes 1-2 business days.</p>
            </div>

            <Button 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
              onClick={handleIdVerificationComplete}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "I've completed verification"}
            </Button>
          </div>
        )}

        {/* Source of Funds - Armalytix */}
        {currentStep === "source-of-funds" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Source of Funds</h1>
              <p className="text-muted-foreground text-sm">Verify your source of funds with Armalytix</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#6366F1]/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-[#6366F1]" />
                </div>
                <div>
                  <p className="font-semibold mb-1">Armalytix Source of Funds Check</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Armalytix uses Open Banking to securely verify your funds. This is a legal requirement for anti-money laundering compliance.
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium">What happens next:</p>
                <ol className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    Click the button below to open Armalytix
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    Securely connect your bank account(s)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    Return here and click "I've connected my bank"
                  </li>
                </ol>
              </div>

              <Button 
                variant="outline"
                className="w-full h-12 rounded-xl font-medium"
                onClick={handleStartSourceOfFunds}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Open Armalytix Source of Funds Check
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
            
            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>Your data is securely encrypted. We only see a summary report, not your full transaction history.</p>
            </div>

            <Button 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
              onClick={handleSourceOfFundsComplete}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "I've connected my bank"}
            </Button>
          </div>
        )}

        {/* Documents */}
        {currentStep === "documents" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Upload Documents</h1>
              <p className="text-muted-foreground text-sm">Upload supporting documents for your transaction</p>
            </div>

            <div className="space-y-3">
              {DOCUMENT_TYPES.map((doc) => {
                const uploaded = getDocumentStatus(doc.id)
                return (
                  <div 
                    key={doc.id} 
                    className={`bg-card border rounded-2xl p-5 transition-colors ${
                      uploaded ? "border-accent bg-accent/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          uploaded ? "bg-accent text-white" : "bg-muted"
                        }`}>
                          {uploaded ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium mb-0.5">
                            {doc.label}
                            {doc.required && <span className="text-destructive ml-1">*</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">{doc.description}</p>
                          {uploaded && (
                            <p className="text-xs text-accent mt-1.5 font-medium">{uploaded.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploaded && (
                          <button 
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleDocumentUpload(e, doc.id)}
                            className="hidden"
                            disabled={uploading}
                          />
                          <span className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                            uploaded 
                              ? "bg-muted text-muted-foreground hover:bg-muted/80" 
                              : "bg-foreground text-background hover:bg-foreground/90"
                          }`}>
                            {uploading && uploadingType === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {uploaded ? "Replace" : "Upload"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
              onClick={() => setCurrentStep("review")}
              disabled={uploadedDocs.length === 0}
            >
              Continue to Review
            </Button>
          </div>
        )}

        {/* Review & Submit */}
        {currentStep === "review" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight mb-2">Review & Submit</h1>
              <p className="text-muted-foreground text-sm">Please review your information before submitting</p>
            </div>

            <div className="space-y-4">
              {/* Personal Details Summary */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium">Personal Details</p>
                  <button 
                    onClick={() => setCurrentStep("personal")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Name</p>
                    <p className="font-medium">{enquiry.first_name} {enquiry.last_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Date of Birth</p>
                    <p className="font-medium">{formData.date_of_birth || "Not provided"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-0.5">Address</p>
                    <p className="font-medium">{formData.current_address || "Not provided"}</p>
                  </div>
                </div>
              </div>

              {/* Verification Summary */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="font-medium mb-4">Verification Status</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <ShieldCheck className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-sm">Identity Verification (Armalytix)</span>
                    </div>
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-accent" />
                      </div>
                      <span className="text-sm">Source of Funds Check (Armalytix)</span>
                    </div>
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                      Completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Documents Summary */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium">Uploaded Documents</p>
                  <button 
                    onClick={() => setCurrentStep("documents")}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-2">
                  {uploadedDocs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                      <span className="text-muted-foreground">
                        {DOCUMENT_TYPES.find(d => d.id === doc.type)?.label || doc.type}:
                      </span>
                      <span className="font-medium truncate">{doc.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
              <Clock className="h-4 w-4 shrink-0 mt-0.5" />
              <p>After submission, our compliance team will review your application. You'll receive an email once the review is complete (typically 1-2 business days).</p>
            </div>

            <Button 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-xl font-medium"
              onClick={handleSubmitOnboarding}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Onboarding"}
            </Button>
          </div>
        )}

        {/* Complete */}
        {currentStep === "complete" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-3">Onboarding Submitted</h1>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed mb-8">
              Thank you for completing your onboarding. Our compliance team will review your application and be in touch within 1-2 business days.
            </p>
            
            <div className="bg-card border border-border rounded-2xl p-6 text-left max-w-sm mx-auto">
              <p className="text-sm font-medium mb-3">What happens next?</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  Our team reviews your verification and documents
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  You'll receive an email with the outcome
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted text-foreground text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  If approved, your matter proceeds to the next stage
                </li>
              </ol>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="max-w-2xl mx-auto px-6">
          <p className="text-xs text-center text-muted-foreground">
            Powered by HomePanel. Your data is protected and encrypted.
          </p>
        </div>
      </footer>
    </div>
  )
}

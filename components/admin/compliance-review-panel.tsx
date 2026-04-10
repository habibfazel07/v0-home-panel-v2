"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  ShieldCheck,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  ExternalLink
} from "lucide-react"

interface ComplianceCheck {
  id: string
  check_type: string
  provider: string
  status: string
  completed_at?: string
  summary_json?: Record<string, unknown>
  exception_flags?: string[]
  review_decision?: string
  review_notes?: string
  reviewed_at?: string
}

interface Document {
  id: string
  name: string
  file_url: string
  document_type: string
  review_status: string
  review_notes?: string
  created_at: string
}

interface ComplianceReviewPanelProps {
  enquiryId?: string
  caseId?: string
  complianceChecks: ComplianceCheck[]
  documents: Document[]
  internalStatus: string
  onStatusUpdate?: () => void
}

const STATUS_CONFIG = {
  not_started: { label: "Not Started", icon: Clock, className: "text-muted-foreground bg-muted" },
  invited: { label: "Invited", icon: Clock, className: "text-purple-700 bg-purple-50" },
  in_progress: { label: "In Progress", icon: Clock, className: "text-blue-700 bg-blue-50" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-blue-700 bg-blue-50" },
  under_review: { label: "Under Review", icon: Clock, className: "text-amber-700 bg-amber-50" },
  approved: { label: "Approved", icon: CheckCircle2, className: "text-accent bg-accent/10" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-red-700 bg-red-50" },
  manual_review_required: { label: "Manual Review", icon: AlertTriangle, className: "text-amber-700 bg-amber-50" },
  failed: { label: "Failed", icon: XCircle, className: "text-red-700 bg-red-50" },
}

const INTERNAL_STATUS_CONFIG = {
  awaiting_client: { label: "Awaiting Client", className: "text-muted-foreground bg-muted" },
  awaiting_reports: { label: "Awaiting Reports", className: "text-blue-700 bg-blue-50" },
  pending_internal_review: { label: "Pending Review", className: "text-amber-700 bg-amber-50" },
  approved_to_proceed: { label: "Approved", className: "text-accent bg-accent/10" },
  escalated: { label: "Escalated", className: "text-red-700 bg-red-50" },
  rejected: { label: "Rejected", className: "text-red-700 bg-red-50" },
}

export function ComplianceReviewPanel({
  enquiryId,
  caseId,
  complianceChecks,
  documents,
  internalStatus,
  onStatusUpdate
}: ComplianceReviewPanelProps) {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  const identityCheck = complianceChecks.find(c => c.check_type === "identity_verification")
  const sofCheck = complianceChecks.find(c => c.check_type === "source_of_funds")

  const approvedDocs = documents.filter(d => d.review_status === "approved").length
  const pendingDocs = documents.filter(d => d.review_status === "pending_review").length
  const rejectedDocs = documents.filter(d => d.review_status === "rejected").length

  // Calculate overall readiness
  const getOverallReadiness = () => {
    const idApproved = identityCheck?.status === "approved"
    const sofApproved = sofCheck?.status === "approved"
    const docsComplete = pendingDocs === 0 && rejectedDocs === 0 && approvedDocs > 0

    if (idApproved && sofApproved && docsComplete) {
      return { status: "ready", label: "Ready to Proceed", className: "text-accent bg-accent/10" }
    }
    if (identityCheck?.status === "rejected" || sofCheck?.status === "rejected") {
      return { status: "blocked", label: "Blocked", className: "text-red-700 bg-red-50" }
    }
    if (identityCheck?.status === "manual_review_required" || sofCheck?.status === "manual_review_required") {
      return { status: "review", label: "Manual Review Required", className: "text-amber-700 bg-amber-50" }
    }
    return { status: "pending", label: "Pending Compliance", className: "text-muted-foreground bg-muted" }
  }

  const readiness = getOverallReadiness()

  const handleReviewDecision = async (checkId: string, decision: "approved" | "rejected" | "manual_review_required") => {
    setSubmitting(checkId)
    try {
      const res = await fetch("/api/admin/compliance/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkId,
          decision,
          notes: reviewNotes[checkId] || "",
        }),
      })
      if (!res.ok) throw new Error("Failed to submit review")
      onStatusUpdate?.()
    } catch (err) {
      console.error("Review error:", err)
    } finally {
      setSubmitting(null)
    }
  }

  const handleInternalStatusUpdate = async (newStatus: string) => {
    setSubmitting("internal")
    try {
      const res = await fetch("/api/admin/compliance/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enquiryId,
          caseId,
          status: newStatus,
        }),
      })
      if (!res.ok) throw new Error("Failed to update status")
      onStatusUpdate?.()
    } catch (err) {
      console.error("Status update error:", err)
    } finally {
      setSubmitting(null)
    }
  }

  const renderStatusBadge = (status: string, config: typeof STATUS_CONFIG) => {
    const cfg = config[status as keyof typeof config] || config.not_started
    const Icon = cfg.icon || Clock
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Compliance Review</h2>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${readiness.className}`}>
            {readiness.label}
          </span>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Identity</span>
            </div>
            {renderStatusBadge(identityCheck?.status || "not_started", STATUS_CONFIG)}
          </div>
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Source of Funds</span>
            </div>
            {renderStatusBadge(sofCheck?.status || "not_started", STATUS_CONFIG)}
          </div>
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Documents</span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              rejectedDocs > 0 ? "text-red-700 bg-red-50" :
              pendingDocs > 0 ? "text-amber-700 bg-amber-50" :
              approvedDocs > 0 ? "text-accent bg-accent/10" :
              "text-muted-foreground bg-muted"
            }`}>
              {rejectedDocs > 0 ? `${rejectedDocs} Rejected` :
               pendingDocs > 0 ? `${pendingDocs} Pending` :
               approvedDocs > 0 ? `${approvedDocs} Approved` : "None"}
            </span>
          </div>
        </div>
      </div>

      {/* Identity Verification Detail */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedCheck(expandedCheck === "identity" ? null : "identity")}
          className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
            <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#00A3E0]/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-[#00A3E0]" />
            </div>
            <div className="text-left">
              <p className="font-medium">Identity Verification</p>
              <p className="text-sm text-muted-foreground">Provider: Credas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {renderStatusBadge(identityCheck?.status || "not_started", STATUS_CONFIG)}
            {expandedCheck === "identity" ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>
        
        {expandedCheck === "identity" && (
          <div className="border-t border-border p-5 space-y-5">
            {identityCheck ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Provider Reference</p>
                    <p className="font-mono text-xs">{identityCheck.id.slice(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Completed At</p>
                    <p>{identityCheck.completed_at ? new Date(identityCheck.completed_at).toLocaleString() : "—"}</p>
                  </div>
                </div>
                
                {identityCheck.exception_flags && identityCheck.exception_flags.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">Exception Flags</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {identityCheck.exception_flags.map((flag, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Review Actions */}
                {identityCheck.status !== "approved" && identityCheck.status !== "rejected" && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add review notes..."
                      value={reviewNotes[identityCheck.id] || ""}
                      onChange={(e) => setReviewNotes(prev => ({ ...prev, [identityCheck.id]: e.target.value }))}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90"
                        onClick={() => handleReviewDecision(identityCheck.id, "approved")}
                        disabled={submitting === identityCheck.id}
                      >
                        {submitting === identityCheck.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewDecision(identityCheck.id, "manual_review_required")}
                        disabled={submitting === identityCheck.id}
                      >
                        Request More Info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleReviewDecision(identityCheck.id, "rejected")}
                        disabled={submitting === identityCheck.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                
                {identityCheck.review_notes && (
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Review Notes</p>
                    <p className="text-sm">{identityCheck.review_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Identity verification not started yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Source of Funds Detail */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedCheck(expandedCheck === "sof" ? null : "sof")}
          className="w-full p-5 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
            <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#6366F1]" />
            </div>
            <div className="text-left">
              <p className="font-medium">Source of Funds</p>
              <p className="text-sm text-muted-foreground">Provider: Credas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {renderStatusBadge(sofCheck?.status || "not_started", STATUS_CONFIG)}
            {expandedCheck === "sof" ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>
        
        {expandedCheck === "sof" && (
          <div className="border-t border-border p-5 space-y-5">
            {sofCheck ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Provider Reference</p>
                    <p className="font-mono text-xs">{sofCheck.id.slice(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Completed At</p>
                    <p>{sofCheck.completed_at ? new Date(sofCheck.completed_at).toLocaleString() : "—"}</p>
                  </div>
                </div>
                
                {sofCheck.exception_flags && sofCheck.exception_flags.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">Exception Flags</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {sofCheck.exception_flags.map((flag, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Review Actions */}
                {sofCheck.status !== "approved" && sofCheck.status !== "rejected" && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add review notes..."
                      value={reviewNotes[sofCheck.id] || ""}
                      onChange={(e) => setReviewNotes(prev => ({ ...prev, [sofCheck.id]: e.target.value }))}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-accent hover:bg-accent/90"
                        onClick={() => handleReviewDecision(sofCheck.id, "approved")}
                        disabled={submitting === sofCheck.id}
                      >
                        {submitting === sofCheck.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewDecision(sofCheck.id, "manual_review_required")}
                        disabled={submitting === sofCheck.id}
                      >
                        Request More Info
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleReviewDecision(sofCheck.id, "rejected")}
                        disabled={submitting === sofCheck.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                
                {sofCheck.review_notes && (
                  <div className="bg-muted rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Review Notes</p>
                    <p className="text-sm">{sofCheck.review_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Source of funds verification not started yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Internal Decision */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Internal Decision</h3>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            INTERNAL_STATUS_CONFIG[internalStatus as keyof typeof INTERNAL_STATUS_CONFIG]?.className || "bg-muted text-muted-foreground"
          }`}>
            {INTERNAL_STATUS_CONFIG[internalStatus as keyof typeof INTERNAL_STATUS_CONFIG]?.label || internalStatus}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {readiness.status === "ready" && internalStatus !== "approved_to_proceed" && (
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90"
              onClick={() => handleInternalStatusUpdate("approved_to_proceed")}
              disabled={submitting === "internal"}
            >
              {submitting === "internal" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve to Proceed"}
            </Button>
          )}
          {internalStatus === "pending_internal_review" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleInternalStatusUpdate("escalated")}
                disabled={submitting === "internal"}
              >
                Escalate
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => handleInternalStatusUpdate("rejected")}
                disabled={submitting === "internal"}
              >
                Reject Matter
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

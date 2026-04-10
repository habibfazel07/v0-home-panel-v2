import { Metadata } from "next"
import { MultiStepForm } from "@/components/multi-step-form"
import { Shield, Clock, Award, Lock } from "lucide-react"

export const metadata: Metadata = {
  title: "Get a Quote | HomePanel",
  description: "Begin your home moving journey with HomePanel. Submit your enquiry in just a few minutes.",
}

const trustIndicators = [
  { icon: Clock,  label: "Under 3 minutes" },
  { icon: Shield, label: "No obligation"   },
  { icon: Award,  label: "SRA regulated"   },
  { icon: Lock,   label: "Fixed fees"      },
]

export default function StartPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-2xl px-6 lg:px-8 py-12 lg:py-16">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight mb-3 text-foreground text-balance"
              style={{ fontFamily: "'DM Serif Display', serif", letterSpacing: "-0.5px" }}>
            Get your conveyancing quote
          </h1>
          <p className="text-muted-foreground leading-relaxed text-base max-w-md mx-auto">
            A few questions about your move. It only takes a few minutes.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-10">
          {trustIndicators.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Form */}
        <MultiStepForm />

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-8 max-w-md mx-auto leading-relaxed">
          Your information is protected under GDPR and will only be used to provide your quote and related conveyancing services.
          We will never share your data without your consent.
        </p>

      </div>
    </div>
  )
}

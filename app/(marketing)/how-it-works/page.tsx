import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Check, FileText, Search, ClipboardCheck, UserCheck, Shield, Clock, HeartHandshake } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const steps = [
  {
    number: "01",
    title: "Submit",
    subtitle: "your enquiry",
    description: "Start by sharing the basics about your move. Whether you're buying, selling, or both, our simple form captures what we need to get started.",
    details: [
      "Select your transaction type",
      "Provide your contact details",
      "Share property information",
      "Takes less than 5 minutes",
    ],
    icon: FileText,
  },
  {
    number: "02",
    title: "Review",
    subtitle: "& preparation",
    description: "Our team carefully reviews your submission to ensure we have everything needed for a smooth onboarding process.",
    details: [
      "Information verification",
      "Initial qualification check",
      "Preparation for next steps",
      "Personal attention to your case",
    ],
    icon: Search,
  },
  {
    number: "03",
    title: "Guided",
    subtitle: "onboarding",
    description: "We guide you through a structured onboarding process, collecting the documentation and information your solicitor will need.",
    details: [
      "Step-by-step guidance",
      "Clear documentation requests",
      "Regular progress updates",
      "Support when you need it",
    ],
    icon: ClipboardCheck,
  },
  {
    number: "04",
    title: "Solicitor",
    subtitle: "allocation",
    description: "Once your onboarding is complete, we connect you with the right solicitor for your transaction, fully prepared to begin.",
    details: [
      "Matched to your needs",
      "Pre-prepared documentation",
      "Smooth handover",
      "Ready to progress",
    ],
    icon: UserCheck,
  },
]

const benefits = [
  {
    icon: Clock,
    title: "Save time",
    description: "Complete your onboarding in hours, not days. Our digital process eliminates back-and-forth paperwork.",
  },
  {
    icon: Shield,
    title: "Stay secure",
    description: "Bank-grade encryption protects your data. We're fully compliant with GDPR and ICO registered.",
  },
  {
    icon: HeartHandshake,
    title: "Get support",
    description: "Our team is here to help at every step. No question is too small, no concern too minor.",
  },
]

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="animate-fade-in-up">
              <p className="text-sm font-medium text-accent mb-3">How it works</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1]">
                A guided path{" "}
                <span className="text-muted-foreground">to your new home.</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                HomePanel transforms the complexity of conveyancing into a simple, 
                step-by-step journey. Here&apos;s how we make moving home feel effortless.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 btn-press"
                >
                  <Link href="/start" className="flex items-center gap-2">
                    Start your move
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
                <Image
                  src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&q=80"
                  alt="Family moving into new home"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-20 lg:py-28 bg-warm">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-accent mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
              Four steps to{" "}
              <span className="text-muted-foreground">simplicity.</span>
            </h2>
          </div>
          
          <div className="space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={step.number}
                  className={cn(
                    "grid lg:grid-cols-12 gap-6 p-8 rounded-2xl bg-background border border-border",
                    "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Number */}
                  <div className="lg:col-span-2">
                    <span className="text-6xl lg:text-7xl font-light text-muted-foreground/20">
                      {step.number}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="lg:col-span-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                        <Icon className="w-6 h-6 text-foreground" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold">{step.title}</h3>
                        <p className="text-lg text-muted-foreground">{step.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                  
                  {/* Details */}
                  <div className="lg:col-span-4">
                    <ul className="space-y-3">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-3 text-sm">
                          <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-accent" />
                          </div>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-accent mb-3">Benefits</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
              Why clients{" "}
              <span className="text-muted-foreground">choose us.</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <div
                  key={benefit.title}
                  className={cn(
                    "text-center p-8 rounded-2xl border border-border bg-card",
                    "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28 bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
            Ready to experience{" "}
            <span className="text-background/60">the difference?</span>
          </h2>
          <p className="mt-6 text-lg text-background/70 max-w-2xl mx-auto">
            Join thousands of home movers who&apos;ve chosen the simpler path to conveyancing.
          </p>
          <div className="mt-10">
            <Button 
              asChild 
              size="lg" 
              className="rounded-full px-8 h-12 bg-background text-foreground hover:bg-background/90 btn-press"
            >
              <Link href="/start" className="flex items-center gap-2">
                Start your move
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

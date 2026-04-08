import { Suspense } from "react"
import Link from "next/link"
import { Hero } from "@/components/hero"
import { Section, SectionHeader } from "@/components/section"
import { FeatureCard } from "@/components/feature-card"
import { CTASection } from "@/components/cta-section"
import { AuthRedirectHandler } from "@/components/auth-redirect-handler"
import { ArrowRight, Building2, Landmark, Scale, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const steps = [
  {
    number: "01",
    title: "Submit your enquiry",
    description: "Share the essential details about your move. It takes less than five minutes.",
  },
  {
    number: "02",
    title: "We review everything",
    description: "Our team prepares your information for a smooth onboarding experience.",
  },
  {
    number: "03",
    title: "Guided onboarding",
    description: "We guide you through each step, collecting what your solicitor needs upfront.",
  },
  {
    number: "04",
    title: "Solicitor allocation",
    description: "Once ready, we connect you with the right solicitor for your transaction.",
  },
]

const benefits = [
  {
    title: "Less stress",
    description: "A calm, guided process that removes the overwhelm from moving home.",
    iconName: "HeartHandshake" as const,
  },
  {
    title: "Faster onboarding",
    description: "Get prepared quickly with our streamlined information gathering.",
    iconName: "Zap" as const,
  },
  {
    title: "Fewer delays",
    description: "Complete documentation upfront means fewer bottlenecks later.",
    iconName: "Clock" as const,
  },
  {
    title: "Better communication",
    description: "Stay informed throughout with clear updates on your progress.",
    iconName: "Users" as const,
  },
]

const partners = [
  {
    title: "Estate Agents",
    description: "Offer your clients a seamless conveyancing experience that reflects your commitment to service.",
    href: "/estate-agents",
    icon: Building2,
  },
  {
    title: "Mortgage Brokers",
    description: "Enhance your client journey with integrated conveyancing that complements your mortgage service.",
    href: "/brokers",
    icon: Landmark,
  },
  {
    title: "Solicitors",
    description: "Receive pre-qualified, well-prepared clients ready to progress through conveyancing.",
    href: "/solicitors",
    icon: Scale,
  },
]

const stats = [
  { value: "2,500+", label: "Transactions completed" },
  { value: "98%", label: "Client satisfaction" },
  { value: "15 days", label: "Average time saved" },
]

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>
      
      {/* Hero */}
      <Hero
        badge="Trusted by thousands of homebuyers"
        title="Moving home, made simple"
        subtitle="HomePanel guides you through the conveyancing process with care. Submit your details, and we prepare everything for a smooth solicitor allocation."
        ctaText="Start your move"
        ctaHref="/start"
        secondaryCtaText="How it works"
        secondaryCtaHref="/how-it-works"
      />

      {/* Stats bar */}
      <div className="border-y border-border bg-card">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 py-10">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className={cn(
                  "text-center",
                  index !== stats.length - 1 && "border-r border-border"
                )}
              >
                <div className="text-3xl lg:text-4xl font-semibold tracking-tight">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits section */}
      <Section>
        <SectionHeader
          title="A better way to start your move"
          subtitle="We believe moving home should feel effortless. HomePanel removes the friction from conveyancing onboarding."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {benefits.map((benefit, index) => (
            <FeatureCard
              key={benefit.title}
              title={benefit.title}
              description={benefit.description}
              iconName={benefit.iconName}
              index={index}
            />
          ))}
        </div>
      </Section>

      {/* How it works - numbered steps */}
      <Section className="bg-warm">
        <SectionHeader
          title="How HomePanel works"
          subtitle="Four simple steps from enquiry to solicitor allocation."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div 
              key={step.number}
              className={cn(
                "relative p-6 rounded-2xl bg-background border border-border",
                "opacity-0 animate-fade-in-up",
                "card-hover"
              )}
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
            >
              <div className="text-4xl font-light text-muted-foreground/30 mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Partners section */}
      <Section>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight text-balance">
              Partner with HomePanel
            </h2>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              We work with professionals across the property industry to deliver a seamless client experience.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Seamless client handover",
                "Real-time progress tracking",
                "Dedicated partner support",
                "White-label solutions available",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-accent" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
            <Button 
              asChild 
              variant="outline" 
              className="mt-8 rounded-full px-6 h-11 border-border btn-press"
            >
              <Link href="/contact">
                Become a partner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4">
            {partners.map((partner, index) => {
              const Icon = partner.icon
              return (
                <Link
                  key={partner.title}
                  href={partner.href}
                  className={cn(
                    "group flex items-start gap-5 p-6 rounded-2xl",
                    "bg-card border border-border",
                    "card-hover",
                    "opacity-0 animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{partner.title}</h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {partner.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </Section>

      {/* CTA */}
      <CTASection
        title="Ready to simplify your move?"
        subtitle="Start your conveyancing journey today. It only takes a few minutes."
        ctaText="Start your move"
        ctaHref="/start"
      />
    </>
  )
}

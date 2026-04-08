import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { AuthRedirectHandler } from "@/components/auth-redirect-handler"
import { ArrowRight, Building2, Landmark, Scale, Check, Shield, Clock, FileCheck, Users, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const stats = [
  { value: "2,500+", label: "transactions completed" },
  { value: "98%", label: "client satisfaction" },
  { value: "15 days", label: "average time saved" },
]

const steps = [
  {
    number: "01",
    title: "Submit",
    subtitle: "your details",
    description: "Share the essential details about your property transaction. It takes less than five minutes to get started.",
  },
  {
    number: "02",
    title: "Verify",
    subtitle: "your identity",
    description: "Complete our secure identity verification and source of funds check. All done digitally, no paperwork.",
  },
  {
    number: "03",
    title: "Connect",
    subtitle: "with your solicitor",
    description: "We match you with an experienced conveyancing solicitor who&apos;ll guide you through to completion.",
  },
]

const features = [
  {
    icon: Shield,
    title: "Bank-grade security",
    description: "Your data is encrypted and protected with enterprise-level security.",
  },
  {
    icon: Clock,
    title: "Save 15+ days",
    description: "Our digital-first approach eliminates delays from paperwork.",
  },
  {
    icon: FileCheck,
    title: "Full transparency",
    description: "Track your transaction progress in real-time, 24/7.",
  },
  {
    icon: Users,
    title: "Expert support",
    description: "Dedicated team available whenever you need assistance.",
  },
]

const partners = [
  {
    title: "Estate Agents",
    description: "Offer your clients a seamless conveyancing experience that reflects your commitment to exceptional service.",
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
    description: "Receive pre-qualified, well-prepared clients ready to progress through conveyancing efficiently.",
    href: "/solicitors",
    icon: Scale,
  },
]

const testimonials = [
  {
    quote: "HomePanel made our house purchase so much smoother. The digital process saved us weeks of back-and-forth.",
    author: "Sarah Mitchell",
    role: "First-time buyer, London",
    avatar: "S",
  },
  {
    quote: "As an estate agent, I recommend HomePanel to all my clients. The transparency and speed are unmatched.",
    author: "James Thompson",
    role: "Director, Thompson & Co",
    avatar: "J",
  },
]

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirectHandler />
      </Suspense>
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20 pointer-events-none" />
        
        <div className="relative mx-auto max-w-6xl px-6 lg:px-8 pt-20 lg:pt-32 pb-16 lg:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left - Content */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-sm text-accent mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Trusted by 2,500+ homebuyers
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.1]">
                Conveyancing,{" "}
                <span className="text-muted-foreground">simplified.</span>
              </h1>
              
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                The modern way to handle property transactions. Digital verification, real-time tracking, and expert solicitors - all in one place.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 btn-press"
                >
                  <Link href="/start" className="flex items-center gap-2">
                    Start your transaction
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  asChild 
                  variant="outline" 
                  size="lg" 
                  className="rounded-full px-8 h-12 border-border"
                >
                  <Link href="/how-it-works">See how it works</Link>
                </Button>
              </div>
              
              {/* Trust badges */}
              <div className="mt-10 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary">
                  <Shield className="h-3.5 w-3.5" />
                  <span>SRA Regulated</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary">
                  <Shield className="h-3.5 w-3.5" />
                  <span>CQS Accredited</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary">
                  <Shield className="h-3.5 w-3.5" />
                  <span>ICO Registered</span>
                </div>
              </div>
            </div>
            
            {/* Right - Image */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: "100ms" }}>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
                <Image
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=600&fit=crop&q=80"
                  alt="Modern home interior"
                  fill
                  className="object-cover"
                  priority
                />
                {/* Floating stat card */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Average completion time</p>
                      <p className="text-2xl font-semibold">8-10 weeks</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground">Success rate</p>
                      <p className="text-2xl font-semibold text-accent">98.5%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label} 
                className={cn(
                  "text-center animate-fade-in-up",
                  index !== stats.length - 1 && "border-r border-border"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight">{stat.value}</div>
                <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-accent mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
              Simple.{" "}
              <span className="text-muted-foreground">Transparent.</span>
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div 
                key={step.number}
                className={cn(
                  "group relative p-8 rounded-2xl border border-border bg-card",
                  "hover:border-foreground/20 hover:shadow-lg transition-all duration-300",
                  "animate-fade-in-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-6xl font-light text-muted-foreground/20 mb-6">
                  {step.number}
                </div>
                <h3 className="text-2xl font-semibold mb-1">
                  {step.title}
                </h3>
                <p className="text-lg text-muted-foreground mb-4">{step.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-28 bg-warm">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-sm font-medium text-accent mb-3">Capabilities</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                Why choose{" "}
                <span className="text-muted-foreground">HomePanel?</span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                We&apos;ve rebuilt conveyancing from the ground up. Modern technology, 
                transparent pricing, and a team that actually cares about your experience.
              </p>
              
              <div className="mt-10 grid sm:grid-cols-2 gap-6">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div 
                      key={feature.title}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 75}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0 shadow-sm">
                          <Icon className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-secondary">
                <Image
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=800&fit=crop&q=80"
                  alt="Beautiful modern home exterior"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Floating metrics card */}
              <div className="absolute -bottom-6 -left-6 p-5 rounded-xl bg-background border border-border shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">15+ days</p>
                    <p className="text-sm text-muted-foreground">saved on average</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-sm font-medium text-accent mb-3">Testimonials</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
              Trusted by{" "}
              <span className="text-muted-foreground">thousands.</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={testimonial.author}
                className={cn(
                  "p-8 rounded-2xl border border-border bg-card",
                  "animate-fade-in-up"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl text-muted-foreground/30 mb-4">&ldquo;</div>
                <p className="text-lg leading-relaxed mb-6">{testimonial.quote}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 lg:py-28 border-t border-border">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div>
              <p className="text-sm font-medium text-accent mb-3">Partners</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                Built for{" "}
                <span className="text-muted-foreground">professionals.</span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                We work with estate agents, mortgage brokers, and solicitors to deliver 
                a seamless experience for their clients.
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
            
            <div className="space-y-4">
              {partners.map((partner, index) => {
                const Icon = partner.icon
                return (
                  <Link
                    key={partner.title}
                    href={partner.href}
                    className={cn(
                      "group flex items-start gap-5 p-6 rounded-2xl",
                      "bg-card border border-border",
                      "hover:border-foreground/20 hover:shadow-lg transition-all duration-300",
                      "animate-fade-in-up"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-7 h-7 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{partner.title}</h3>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {partner.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight animate-fade-in-up">
            Ready to simplify your{" "}
            <span className="text-background/60">property transaction?</span>
          </h2>
          <p className="mt-6 text-lg text-background/70 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "50ms" }}>
            Join thousands of homebuyers who&apos;ve discovered a better way to handle conveyancing. 
            Get started in minutes.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <Button 
              asChild 
              size="lg" 
              className="rounded-full px-8 h-12 bg-background text-foreground hover:bg-background/90 btn-press"
            >
              <Link href="/start" className="flex items-center gap-2">
                Start your transaction
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="ghost" 
              size="lg" 
              className="rounded-full px-8 h-12 text-background/70 hover:text-background hover:bg-background/10"
            >
              <Link href="/contact">Talk to our team</Link>
            </Button>
          </div>
          <p className="mt-8 text-sm text-background/50 animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            Free quote in under 5 minutes
          </p>
        </div>
      </section>
    </>
  )
}

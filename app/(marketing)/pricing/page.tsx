import Link from "next/link"
import { Check, ArrowRight, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const pricingTiers = [
  {
    name: "Sale Only",
    price: "£850",
    description: "For selling your property",
    features: [
      "Dedicated conveyancer",
      "Digital document signing",
      "Real-time progress tracking",
      "Email & phone support",
      "Standard searches included",
    ],
    cta: "Get started",
    href: "/start?type=sale",
    popular: false,
  },
  {
    name: "Purchase Only",
    price: "£950",
    description: "For buying your new home",
    features: [
      "Dedicated conveyancer",
      "Digital document signing",
      "Real-time progress tracking",
      "Priority support",
      "All standard searches",
      "Mortgage liaison",
      "SDLT calculation & filing",
    ],
    cta: "Get started",
    href: "/start?type=purchase",
    popular: true,
  },
  {
    name: "Sale & Purchase",
    price: "£1,650",
    description: "Complete chain transaction",
    features: [
      "Everything in both tiers",
      "Chain coordination",
      "Dedicated case manager",
      "24/7 priority support",
      "Exchange & completion sync",
      "Post-completion support",
    ],
    cta: "Get started",
    href: "/start?type=both",
    popular: false,
  },
]

const additionalServices = [
  { name: "Leasehold supplement", price: "£250" },
  { name: "New build supplement", price: "£150" },
  { name: "Help to Buy ISA/Lifetime ISA", price: "£75" },
  { name: "Shared ownership", price: "£200" },
  { name: "Gifted deposit declaration", price: "£50" },
  { name: "Transfer of equity", price: "£450" },
]

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-accent mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight">
            Transparent{" "}
            <span className="text-muted-foreground">pricing.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            No hidden fees, no surprises. Our fixed-fee conveyancing means you know exactly what you&apos;ll pay from the start.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 lg:pb-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {pricingTiers.map((tier, index) => (
              <div
                key={tier.name}
                className={cn(
                  "relative p-8 rounded-2xl border",
                  "animate-fade-in-up",
                  tier.popular 
                    ? "border-foreground bg-foreground text-background" 
                    : "border-border bg-card"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                    Most Popular
                  </div>
                )}
                
                <div className="text-6xl font-light opacity-20 mb-4">
                  0{index + 1}
                </div>
                
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className={cn(
                  "text-sm mt-1",
                  tier.popular ? "text-background/70" : "text-muted-foreground"
                )}>
                  {tier.description}
                </p>
                
                <div className="mt-6 mb-8">
                  <span className="text-4xl font-semibold">{tier.price}</span>
                  <span className={cn(
                    "text-sm ml-1",
                    tier.popular ? "text-background/70" : "text-muted-foreground"
                  )}>
                    + VAT
                  </span>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        tier.popular ? "text-accent" : "text-accent"
                      )} />
                      <span className={tier.popular ? "text-background/90" : ""}>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  asChild
                  className={cn(
                    "w-full h-11 rounded-xl btn-press",
                    tier.popular 
                      ? "bg-background text-foreground hover:bg-background/90" 
                      : "bg-foreground text-background hover:bg-foreground/90"
                  )}
                >
                  <Link href={tier.href} className="flex items-center justify-center gap-2">
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>No completion, no fee</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Fixed price guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>SRA regulated</span>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Services */}
      <section className="py-20 lg:py-28 bg-warm">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Additional{" "}
              <span className="text-muted-foreground">services.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Supplements for more complex transactions
            </p>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {additionalServices.map((service, index) => (
              <div
                key={service.name}
                className={cn(
                  "flex items-center justify-between p-5",
                  index !== additionalServices.length - 1 && "border-b border-border"
                )}
              >
                <span className="text-sm">{service.name}</span>
                <span className="font-semibold">{service.price} <span className="text-muted-foreground font-normal text-xs">+ VAT</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Teaser */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Questions about{" "}
            <span className="text-muted-foreground">pricing?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Our team is here to help you understand exactly what&apos;s included and provide a personalised quote.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              asChild 
              size="lg" 
              className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 btn-press"
            >
              <Link href="/start" className="flex items-center gap-2">
                Get your quote
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              size="lg" 
              className="rounded-full px-8 h-12 border-border"
            >
              <Link href="/contact">Talk to our team</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

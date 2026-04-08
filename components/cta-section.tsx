"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CTASectionProps {
  title: string
  subtitle?: string
  ctaText?: string
  ctaHref?: string
}

export function CTASection({
  title,
  subtitle,
  ctaText = "Get started",
  ctaHref = "/start",
}: CTASectionProps) {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div
          className={cn(
            "rounded-3xl bg-foreground text-background",
            "p-10 lg:p-16 text-center",
            "opacity-0 animate-scale-in"
          )}
          style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
        >
          <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-balance max-w-xl mx-auto">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-base lg:text-lg text-background/70 max-w-md mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className={cn(
                "rounded-full px-8 h-12 text-base",
                "bg-background text-foreground",
                "hover:bg-background/90",
                "btn-press",
                "transition-all duration-200"
              )}
            >
              <Link href={ctaHref} className="flex items-center gap-2">
                {ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeroProps {
  title: string
  subtitle: string
  ctaText?: string
  ctaHref?: string
  secondaryCtaText?: string
  secondaryCtaHref?: string
  badge?: string
}

export function Hero({
  title,
  subtitle,
  ctaText = "Get started",
  ctaHref = "/start",
  secondaryCtaText,
  secondaryCtaHref,
  badge,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/30 pointer-events-none" />
      
      <div className="relative mx-auto max-w-5xl px-6 lg:px-8 py-24 lg:py-36">
        <div className="text-center">
          {/* Optional badge */}
          {badge && (
            <div 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-sm text-muted-foreground mb-8 opacity-0 animate-fade-in"
              style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {badge}
            </div>
          )}
          
          {/* Title */}
          <h1 
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-[1.08] opacity-0 animate-fade-in-up"
            style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
          >
            {title}
          </h1>
          
          {/* Subtitle */}
          <p 
            className="mt-6 lg:mt-8 text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto text-pretty opacity-0 animate-fade-in-up"
            style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
          >
            {subtitle}
          </p>
          
          {/* CTAs */}
          <div 
            className="mt-10 lg:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
          >
            <Button 
              asChild 
              size="lg" 
              className={cn(
                "rounded-full px-8 h-12 text-base",
                "bg-foreground text-background",
                "hover:bg-foreground/90",
                "btn-press",
                "shadow-lg shadow-foreground/10",
                "transition-all duration-200"
              )}
            >
              <Link href={ctaHref} className="flex items-center gap-2">
                {ctaText}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {secondaryCtaText && secondaryCtaHref && (
              <Button 
                asChild 
                variant="ghost" 
                size="lg" 
                className="rounded-full px-8 h-12 text-base text-muted-foreground hover:text-foreground"
              >
                <Link href={secondaryCtaHref}>{secondaryCtaText}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

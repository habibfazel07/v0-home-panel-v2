import Link from "next/link"
import { Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const footerLinks = {
  services: {
    title: "Services",
    links: [
      { href: "/how-it-works", label: "How it Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/start", label: "Get a Quote" },
    ],
  },
  partners: {
    title: "Partners",
    links: [
      { href: "/estate-agents", label: "Estate Agents" },
      { href: "/brokers", label: "Mortgage Brokers" },
      { href: "/solicitors", label: "Solicitors" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/careers", label: "Careers" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/complaints", label: "Complaints" },
    ],
  },
}

const trustBadges = [
  { label: "SRA Regulated" },
  { label: "CQS Accredited" },
  { label: "ICO Registered" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                  <span className="text-background font-bold text-sm">HP</span>
                </div>
                <span className="font-semibold tracking-tight">HomePanel</span>
              </Link>
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
                Making property transactions simpler, faster, and more transparent for everyone.
              </p>
              
              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap gap-2">
                {trustBadges.map((badge) => (
                  <div 
                    key={badge.label}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs text-muted-foreground"
                  >
                    <Shield className="h-3 w-3" />
                    {badge.label}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Link columns */}
            {Object.values(footerLinks).map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold mb-4">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "text-sm text-muted-foreground",
                          "hover:text-foreground transition-colors duration-200"
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom bar */}
        <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} HomePanel. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link 
              href="https://twitter.com/homepanel" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </Link>
            <Link 
              href="https://linkedin.com/company/homepanel" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

import Link from "next/link"
import { cn } from "@/lib/utils"

const footerLinks = {
  product: [
    { href: "/how-it-works", label: "How it Works" },
    { href: "/start", label: "Get a Quote" },
  ],
  partners: [
    { href: "/estate-agents", label: "Estate Agents" },
    { href: "/brokers", label: "Mortgage Brokers" },
    { href: "/solicitors", label: "Solicitors" },
  ],
  company: [
    { href: "/contact", label: "Contact" },
    { href: "#", label: "Privacy Policy" },
    { href: "#", label: "Terms of Service" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img 
                src="/logo.svg" 
                alt="HomePanel" 
                className="h-8 w-8 transition-transform duration-200 group-hover:scale-105" 
              />
              <span className="font-semibold text-lg tracking-tight">HomePanel</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Simplifying the home moving process with guided conveyancing onboarding.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-medium text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm text-muted-foreground",
                      "hover:text-foreground",
                      "transition-colors duration-200"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners */}
          <div>
            <h3 className="font-medium text-sm mb-4">Partners</h3>
            <ul className="space-y-3">
              {footerLinks.partners.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm text-muted-foreground",
                      "hover:text-foreground",
                      "transition-colors duration-200"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-medium text-sm mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={cn(
                      "text-sm text-muted-foreground",
                      "hover:text-foreground",
                      "transition-colors duration-200"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} HomePanel. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link 
              href="#" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              LinkedIn
            </Link>
            <Link 
              href="#" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Twitter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

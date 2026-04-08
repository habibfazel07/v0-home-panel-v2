"use client"

import Link from "next/link"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/how-it-works", label: "How it Works" },
  { href: "/estate-agents", label: "Estate Agents" },
  { href: "/brokers", label: "Brokers" },
  { href: "/pricing", label: "Pricing" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-sm">HP</span>
            </div>
            <span className="font-semibold text-base tracking-tight">HomePanel</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm text-muted-foreground",
                  "transition-colors duration-200 hover:text-foreground",
                  "rounded-lg hover:bg-secondary/60"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Button 
              asChild 
              variant="ghost" 
              size="sm" 
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button 
              asChild 
              size="sm" 
              className={cn(
                "rounded-full px-5 h-9",
                "bg-foreground text-background",
                "hover:bg-foreground/90",
                "btn-press"
              )}
            >
              <Link href="/start" className="flex items-center gap-1.5">
                Get started
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className={cn(
              "lg:hidden p-2 -m-2 rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-secondary/60",
              "transition-colors duration-200"
            )}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="sr-only">Toggle menu</span>
            <motion.div
              animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.div>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-border/40 bg-background overflow-hidden"
          >
            <div className="px-6 py-6 space-y-1">
              {navLinks.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "block py-3 px-3 -mx-3 rounded-lg",
                      "text-base text-muted-foreground",
                      "hover:text-foreground hover:bg-secondary/60",
                      "transition-colors duration-200"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div 
                className="pt-6 flex flex-col gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Button 
                  asChild 
                  variant="outline" 
                  className="w-full h-11 rounded-xl"
                >
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button 
                  asChild 
                  className="w-full h-11 rounded-xl bg-foreground text-background btn-press"
                >
                  <Link href="/start" className="flex items-center justify-center gap-2">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

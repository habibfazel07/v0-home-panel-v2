"use client"

import { cn } from "@/lib/utils"
import {
  Users,
  Clock,
  TrendingUp,
  Shield,
  Handshake,
  FileCheck,
  Zap,
  BarChart3,
  UserCheck,
  FileStack,
  Timer,
  Briefcase,
  Home,
  FileText,
  HeartHandshake,
  Sparkles,
} from "lucide-react"

const iconMap = {
  Users,
  Clock,
  TrendingUp,
  Shield,
  Handshake,
  FileCheck,
  Zap,
  BarChart3,
  UserCheck,
  FileStack,
  Timer,
  Briefcase,
  Home,
  FileText,
  HeartHandshake,
  Sparkles,
} as const

type IconName = keyof typeof iconMap

interface FeatureCardProps {
  title: string
  description: string
  iconName: IconName
  index?: number
  className?: string
}

export function FeatureCard({ title, description, iconName, index = 0, className }: FeatureCardProps) {
  const Icon = iconMap[iconName]
  
  return (
    <div
      className={cn(
        "group p-6 lg:p-7 rounded-2xl bg-card border border-border",
        "card-hover",
        "animate-fade-in-up",
        className
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center mb-5">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

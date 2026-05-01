"use client"

import {
  ModernCard,
  ModernCardContent,
  ModernCardDescription,
  ModernCardHeader,
  ModernCardTitle,
} from "@/components/ui/modern-card"
import { Badge } from "@/components/ui/badge"
import { Users, Crown, Heart, Zap } from "lucide-react"

interface CustomerSegment {
  customerId: string
  segment: "VIP" | "Loyal" | "Repeat" | "New"
  rfmScore: number
}

interface CustomerSegmentsProps {
  segments: CustomerSegment[]
}

const segmentConfig = {
  VIP: { icon: Crown, color: "bg-yellow-500/20 text-yellow-300", label: "VIP Customer" },
  Loyal: { icon: Heart, color: "bg-red-500/20 text-red-300", label: "Loyal Customer" },
  Repeat: { icon: Zap, color: "bg-blue-500/20 text-blue-300", label: "Repeat Customer" },
  New: { icon: Users, color: "bg-green-500/20 text-green-300", label: "New Customer" },
}

export function CustomerSegments({ segments }: CustomerSegmentsProps) {
  const grouped = segments.reduce(
    (acc, seg) => {
      if (!acc[seg.segment]) acc[seg.segment] = 0
      acc[seg.segment]++
      return acc
    },
    {} as Record<string, number>,
  )

  return (
    <ModernCard>
      <ModernCardHeader>
        <ModernCardTitle className="text-slate-50">Customer Segmentation (RFM)</ModernCardTitle>
        <ModernCardDescription className="text-slate-400">Recency, Frequency, Monetary analysis</ModernCardDescription>
      </ModernCardHeader>
      <ModernCardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(segmentConfig).map(([segment, config]) => {
            const Icon = config.icon
            const count = grouped[segment as keyof typeof segmentConfig] || 0
            return (
              <div key={segment} className="p-4 glass-dark rounded-lg text-center">
                <Icon className={`w-6 h-6 mx-auto mb-2 ${config.color}`} />
                <p className="text-sm text-slate-300 mb-1">{config.label}</p>
                <p className="text-2xl font-bold text-slate-50">{count}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-sm font-semibold text-slate-300">Top VIPs</p>
          {segments
            .filter((s) => s.segment === "VIP")
            .slice(0, 5)
            .map((seg) => (
              <div key={seg.customerId} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                <span className="text-xs text-slate-400">{seg.customerId.substring(0, 8)}...</span>
                <Badge className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30">Score: {seg.rfmScore}</Badge>
              </div>
            ))}
        </div>
      </ModernCardContent>
    </ModernCard>
  )
}

"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { ModernCard, ModernCardContent } from "@/components/ui/modern-card"
import { LineChart, Line, ResponsiveContainer } from "recharts"

interface DrillDownMetricProps {
  metric: string
  current: number
  breakdown: Array<{
    label: string
    value: number
    percentage: number
    sparkline?: number[]
  }>
}

export function DrillDownMetric({ metric, current, breakdown }: DrillDownMetricProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <ModernCard variant="interactive">
      <ModernCardContent className="pt-6">
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">{metric}</p>
              <p className="text-3xl font-bold text-slate-50">{current.toLocaleString()}</p>
            </div>
            <ChevronDown className={`w-5 h-5 text-blue-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </button>

        {expanded && (
          <div className="mt-6 pt-6 border-t border-slate-700/50 space-y-3">
            {breakdown.map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{item.label}</span>
                  <div className="text-right">
                    <p className="text-slate-50 font-semibold">{item.value.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">{item.percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-slate-700/30 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                {item.sparkline && (
                  <ResponsiveContainer width="100%" height={30}>
                    <LineChart data={item.sparkline.map((v, idx) => ({ idx, v }))}>
                      <Line type="monotone" dataKey="v" stroke="#3b82f6" dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            ))}
          </div>
        )}
      </ModernCardContent>
    </ModernCard>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, TrendingUp, TrendingDown, AlertCircle, Lightbulb } from "lucide-react"

interface Insight {
  metric: string
  value: number
  trend: "up" | "down" | "stable"
  confidence: number
  recommendation: string
}

interface AIInsightsPanelProps {
  organizationId: string
  metrics: any
}

export function AIInsightsPanel({ organizationId, metrics }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [businessInsights, setBusinessInsights] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchInsights()
  }, [organizationId, metrics])

  async function fetchInsights() {
    try {
      setLoading(true)

      // Fetch revenue prediction
      const revenuePrediction = await fetch("/api/ai/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "revenue",
          organizationId,
          data: metrics.revenueHistory,
        }),
      }).then((res) => res.json())

      // Fetch business insights
      const businessInsight = await fetch("/api/ai/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "insights",
          organizationId,
          data: metrics.businessMetrics,
        }),
      }).then((res) => res.json())

      setInsights([revenuePrediction])
      setBusinessInsights(businessInsight.insights || [])
    } catch (error) {
      console.error("[v0] Failed to fetch insights:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            Smart Recommendations
          </CardTitle>
          <CardDescription>AI-powered insights for your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {businessInsights.length > 0 ? (
            businessInsights.map((insight, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-blue-500/50 transition-colors"
              >
                <p className="text-sm text-slate-300">{insight}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No insights available yet</p>
          )}
        </CardContent>
      </Card>

      {insights.map((insight, i) => (
        <Card key={i} className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{insight.metric}</CardTitle>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold">{insight.value}%</span>
                {insight.trend === "up" && <TrendingUp className="w-5 h-5 text-green-400" />}
                {insight.trend === "down" && <TrendingDown className="w-5 h-5 text-red-400" />}
              </div>
            </div>
            <CardDescription>Confidence: {insight.confidence}%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-300">{insight.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

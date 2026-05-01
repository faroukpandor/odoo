"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  Users,
  DollarSign,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  ModernCard,
  ModernCardContent,
  ModernCardHeader,
  ModernCardTitle,
  ModernCardDescription,
} from "@/components/ui/modern-card"
import { LiveSyncIndicator } from "@/components/live-sync-indicator"
import { PresenceIndicator } from "@/components/presence-indicator"
import { AIInsightsPanel } from "@/components/ai-insights-panel"

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchMetrics()
  }, [])

  async function fetchMetrics() {
    try {
      setIsLoadingMetrics(true)
      const response = await fetch("/api/reports/dashboard")
      if (!response.ok) throw new Error("Failed to fetch metrics")
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error("[v0] Error fetching metrics:", error)
    } finally {
      setIsLoadingMetrics(false)
    }
  }

  async function generateAIInsights() {
    setIsLoadingAI(true)
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      })
      if (response.ok) {
        const insights = await response.json()
        setAiInsights(insights)
      }
    } catch (error) {
      console.error("[v0] Error generating insights:", error)
    } finally {
      setIsLoadingAI(false)
    }
  }

  const chartData = [
    { month: "Jan", revenue: 40000, orders: 24 },
    { month: "Feb", revenue: 45000, orders: 28 },
    { month: "Mar", revenue: 52000, orders: 31 },
    { month: "Apr", revenue: 48000, orders: 25 },
    { month: "May", revenue: 61000, orders: 35 },
    { month: "Jun", revenue: metrics?.revenue?.total || 0, orders: 84 },
  ]

  if (isLoadingMetrics) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-40 bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  const kpis = [
    {
      icon: DollarSign,
      label: "Total Revenue",
      value: `$${(metrics?.revenue?.total || 0).toLocaleString()}`,
      change: "+12.5%",
      trend: "up",
    },
    {
      icon: Users,
      label: "Active Customers",
      value: metrics?.customers?.active || 0,
      change: "+5.2%",
      trend: "up",
    },
    {
      icon: Package,
      label: "Low Stock Items",
      value: metrics?.inventory?.lowStock || 0,
      change: metrics?.inventory?.lowStock ? "-2.3%" : "0%",
      trend: metrics?.inventory?.lowStock ? "down" : "neutral",
    },
    {
      icon: TrendingUp,
      label: "Active Employees",
      value: metrics?.employees?.active || 0,
      change: "+8.1%",
      trend: "up",
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-50">Dashboard</h1>
          <p className="text-slate-400 mt-2">Real-time business metrics and insights</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <PresenceIndicator organizationId="current-org-id" />
          <LiveSyncIndicator isConnected={true} isSyncing={false} lastSync={new Date()} />
          <Button variant="outline" onClick={fetchMetrics}>
            Refresh
          </Button>
          <Button
            onClick={generateAIInsights}
            disabled={isLoadingAI}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isLoadingAI ? (
              "Generating..."
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> Generate AI Report
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {kpis.map((metric, i) => {
          const Icon = metric.icon
          const isPositive = metric.trend === "up"
          return (
            <ModernCard key={i} variant="interactive">
              <ModernCardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
                    <p className="text-2xl font-bold text-slate-50">{metric.value}</p>
                    {metric.trend !== "neutral" && (
                      <div
                        className={`flex items-center gap-1 mt-2 text-sm ${
                          isPositive ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {metric.change}
                      </div>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </ModernCardContent>
            </ModernCard>
          )
        })}
      </div>

      {/* Alerts */}
      {metrics?.inventory?.lowStock > 0 && (
        <Card className="border-yellow-600/50 bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-200">Low Stock Alert</p>
                <p className="text-yellow-100/80 text-sm">
                  {metrics.inventory.lowStock} items are below reorder level. Review inventory management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="text-slate-50">Revenue Trend</ModernCardTitle>
              <ModernCardDescription className="text-slate-400">Monthly revenue performance</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    dot={{ fill: "#3b82f6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ModernCardContent>
          </ModernCard>

          <ModernCard>
            <ModernCardHeader>
              <ModernCardTitle className="text-slate-50">Invoice Status</ModernCardTitle>
              <ModernCardDescription className="text-slate-400">Payment status breakdown</ModernCardDescription>
            </ModernCardHeader>
            <ModernCardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid</span>
                  <span className="text-green-400 font-semibold">{metrics?.revenue?.paid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pending</span>
                  <span className="text-yellow-400 font-semibold">{metrics?.revenue?.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overdue</span>
                  <span className="text-red-400 font-semibold">{metrics?.revenue?.overdue}</span>
                </div>
              </div>
            </ModernCardContent>
          </ModernCard>
        </div>

        <div>
          <AIInsightsPanel
            organizationId="current-org-id"
            metrics={{
              revenueHistory: chartData,
              businessMetrics: {
                revenue: metrics?.revenue?.total || 0,
                customers: metrics?.customers?.active || 0,
                avgOrderValue: (metrics?.revenue?.total || 0) / Math.max(metrics?.customers?.active || 1, 1),
                inventory: 50000,
              },
            }}
          />
        </div>
      </div>

      {/* AI Insights */}
      <Card className="border-slate-700 bg-gradient-to-br from-slate-900/50 to-slate-900/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <Sparkles className="w-5 h-5 text-yellow-400" /> AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiInsights ? (
            <>
              {aiInsights.analysis && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-sm font-medium text-blue-400 mb-1">Analysis</p>
                  <p className="text-slate-300 text-sm">{aiInsights.analysis}</p>
                </div>
              )}
              {aiInsights.recommendations && (
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-sm font-medium text-green-400 mb-1">Recommendations</p>
                  <p className="text-slate-300 text-sm">{aiInsights.recommendations}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-slate-300 text-sm">
              Click "Generate AI Report" to get personalized business insights powered by Grok AI.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

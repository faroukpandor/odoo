"use client"

import React from "react"
import { useData } from "@/lib/hooks/use-data"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, Users, ShoppingCart, DollarSign, Sparkles, Download } from "lucide-react"
import {
  ModernCard,
  ModernCardContent,
  ModernCardDescription,
  ModernCardHeader,
  ModernCardTitle,
} from "@/components/ui/modern-card"
import { DrillDownMetric } from "@/components/drill-down-metric"
import { ForecastChart } from "@/components/forecast-chart"
import { CustomerSegments } from "@/components/customer-segments"
import { NLQSearch } from "@/components/nlq-search"
import { getDrillDownData, generateForecast, rfmSegmentation } from "@/lib/analytics/bi-engine"

export default function AnalyticsPage() {
  const { data: invoices } = useData<any>({ table: "invoices" })
  const { data: customers } = useData<any>({ table: "customers" })
  const [aiInsights, setAiInsights] = React.useState(false)
  const [drillDownData, setDrillDownData] = React.useState<any>(null)
  const [forecastData, setForecastData] = React.useState<any>(null)
  const [rfmSegments, setRfmSegments] = React.useState<any[]>([])

  React.useEffect(() => {
    loadAdvancedAnalytics()
  }, [invoices, customers])

  async function loadAdvancedAnalytics() {
    // Prepare revenue data
    const monthlyRevenue = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((acc, inv) => {
        const month = new Date(inv.issue_date).toLocaleDateString("en-US", { month: "short" })
        const existing = acc.find((m) => m.month === month) || { month, revenue: 0 }
        return [
          ...acc.filter((m) => m.month !== month),
          { ...existing, revenue: existing.revenue + (inv.total_amount || 0) },
        ]
      }, [] as any[])

    const totalRevenue = invoices
      .filter((inv) => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const pending = invoices
      .filter((inv) => inv.status === "pending")
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
    const overdue = invoices
      .filter((inv) => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const revenue = await getDrillDownData(
      "revenue",
      {
        total: totalRevenue,
        paid: totalRevenue,
        pending,
        overdue,
      },
      null,
    )
    setDrillDownData(revenue)

    const forecast = generateForecast(monthlyRevenue)
    setForecastData(forecast)

    const transactions = invoices.map((inv) => ({
      customer_id: inv.customer_id,
      date: inv.issue_date,
      amount: inv.total_amount,
    }))
    const segments = rfmSegmentation(transactions)
    setRfmSegments(segments)
  }

  async function generateAIInsights() {
    try {
      const response = await fetch("/api/ai/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "insights",
          organizationId: "current-org-id",
          data: {
            revenue: invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
            customers: customers.length,
            avgOrderValue:
              invoices.length > 0
                ? invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) / invoices.length
                : 0,
            inventory: 50000,
          },
        }),
      })
      if (response.ok) {
        const insights = await response.json()
        setAiInsights(insights)
      }
    } catch (error) {
      console.error("[v0] Error generating insights:", error)
    }
  }

  const monthlyRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((acc, inv) => {
      const month = new Date(inv.issue_date).toLocaleDateString("en-US", { month: "short" })
      const existing = acc.find((m) => m.month === month) || { month, revenue: 0 }
      return [
        ...acc.filter((m) => m.month !== month),
        { ...existing, revenue: existing.revenue + (inv.total_amount || 0) },
      ]
    }, [] as any[])

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const averageOrderValue = invoices.length > 0 ? totalRevenue / invoices.length : 0
  const conversionRate = customers.length > 0 ? ((invoices.length / customers.length) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Advanced Analytics</h1>
          <p className="text-slate-400 mt-1">Deep insights into your business performance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={generateAIInsights}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" /> AI Insights
          </Button>
          <Button variant="outline" className="border-slate-700 bg-transparent">
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Natural Language Query */}
      <NLQSearch organizationId="current-org-id" />

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          {
            icon: DollarSign,
            label: "Total Revenue",
            value: `$${totalRevenue.toLocaleString()}`,
            color: "text-green-400",
          },
          { icon: Users, label: "Total Customers", value: customers.length, color: "text-blue-400" },
          {
            icon: ShoppingCart,
            label: "Avg Order Value",
            value: `$${averageOrderValue.toFixed(0)}`,
            color: "text-purple-400",
          },
          { icon: TrendingUp, label: "Conversion Rate", value: `${conversionRate}%`, color: "text-pink-400" },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <ModernCard key={i} variant="interactive">
              <ModernCardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
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

      {/* Drill-down Metrics */}
      {drillDownData && (
        <DrillDownMetric
          metric={drillDownData.metric}
          current={drillDownData.current}
          breakdown={drillDownData.breakdown}
        />
      )}

      {/* Forecast */}
      {forecastData && (
        <ForecastChart
          data={forecastData}
          title="12-Month Revenue Forecast"
          description="AI-powered projection with confidence intervals"
        />
      )}

      {/* Customer Segmentation */}
      {rfmSegments.length > 0 && <CustomerSegments segments={rfmSegments} />}

      {/* Historical Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="text-slate-50">Monthly Revenue</ModernCardTitle>
            <ModernCardDescription className="text-slate-400">Revenue trend over time</ModernCardDescription>
          </ModernCardHeader>
          <ModernCardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyRevenue.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" dot={{ fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </ModernCardContent>
        </ModernCard>

        <ModernCard>
          <ModernCardHeader>
            <ModernCardTitle className="text-slate-50">Invoice Distribution</ModernCardTitle>
            <ModernCardDescription className="text-slate-400">Status breakdown</ModernCardDescription>
          </ModernCardHeader>
          <ModernCardContent>
            <div className="space-y-3">
              {[
                { label: "Paid", value: invoices.filter((i) => i.status === "paid").length, color: "text-green-400" },
                {
                  label: "Pending",
                  value: invoices.filter((i) => i.status === "pending").length,
                  color: "text-yellow-400",
                },
                {
                  label: "Overdue",
                  value: invoices.filter((i) => i.status === "overdue").length,
                  color: "text-red-400",
                },
              ].map((stat, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-slate-400">{stat.label}</span>
                  <span className={`font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </ModernCardContent>
        </ModernCard>
      </div>

      {aiInsights && typeof aiInsights === "object" && aiInsights.insights && (
        <ModernCard variant="gradient">
          <ModernCardHeader>
            <ModernCardTitle className="flex items-center gap-2 text-slate-50">
              <Sparkles className="w-5 h-5 text-yellow-400" /> AI-Generated Recommendations
            </ModernCardTitle>
          </ModernCardHeader>
          <ModernCardContent className="space-y-2">
            {(aiInsights.insights as string[]).map((insight, i) => (
              <div key={i} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <p className="text-sm text-slate-300">{insight}</p>
              </div>
            ))}
          </ModernCardContent>
        </ModernCard>
      )}
    </div>
  )
}

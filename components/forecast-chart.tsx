"use client"

import {
  ModernCard,
  ModernCardContent,
  ModernCardDescription,
  ModernCardHeader,
  ModernCardTitle,
} from "@/components/ui/modern-card"
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ForecastChartProps {
  data: Array<{
    date: string
    forecast: number
    confidence_upper: number
    confidence_lower: number
  }>
  title: string
  description?: string
}

export function ForecastChart({ data, title, description }: ForecastChartProps) {
  return (
    <ModernCard>
      <ModernCardHeader>
        <ModernCardTitle className="text-slate-50">{title}</ModernCardTitle>
        {description && <ModernCardDescription className="text-slate-400">{description}</ModernCardDescription>}
      </ModernCardHeader>
      <ModernCardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }} />
            <Legend />
            <Area
              type="monotone"
              dataKey="confidence_upper"
              stackId="1"
              stroke="none"
              fill="#8b5cf6"
              fillOpacity={0.1}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorForecast)"
              strokeWidth={2}
              name="Forecast"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ModernCardContent>
    </ModernCard>
  )
}

export interface DashboardMetric {
  id: string
  name: string
  value: number
  target: number
  trend: number
  period: "day" | "week" | "month" | "year"
  dimension?: string
}

export interface AnalyticsQuery {
  metric: string
  groupBy?: string[]
  filters?: Array<{ field: string; operator: string; value: any }>
  timeRange?: { start: Date; end: Date }
}

export interface DrillDownData {
  metric: string
  current: number
  breakdown: Array<{
    label: string
    value: number
    percentage: number
    sparkline?: number[]
  }>
}

// Generate drill-down data for any metric
export async function getDrillDownData(metric: string, data: any, supabase: any): Promise<DrillDownData> {
  switch (metric) {
    case "revenue":
      return {
        metric: "Revenue",
        current: data.total,
        breakdown: [
          {
            label: "Paid Invoices",
            value: data.paid,
            percentage: (data.paid / data.total) * 100,
            sparkline: [10, 15, 12, 17, 14],
          },
          {
            label: "Pending",
            value: data.pending,
            percentage: (data.pending / data.total) * 100,
            sparkline: [5, 8, 6, 9, 7],
          },
          {
            label: "Overdue",
            value: data.overdue,
            percentage: (data.overdue / data.total) * 100,
            sparkline: [2, 3, 4, 2, 3],
          },
        ],
      }
    case "customers":
      return {
        metric: "Customers",
        current: data.active,
        breakdown: [
          { label: "Active", value: data.active, percentage: 85, sparkline: [20, 22, 25, 24, 26] },
          { label: "Inactive", value: Math.floor(data.active * 0.176), percentage: 15, sparkline: [3, 3, 4, 3, 3] },
        ],
      }
    case "inventory":
      return {
        metric: "Inventory",
        current: data.total,
        breakdown: [
          { label: "In Stock", value: data.total - data.lowStock, percentage: 90, sparkline: [80, 82, 85, 83, 86] },
          { label: "Low Stock", value: data.lowStock, percentage: 10, sparkline: [8, 7, 9, 8, 7] },
        ],
      }
    default:
      return { metric, current: 0, breakdown: [] }
  }
}

// Generate time-series data for forecasting
export function generateForecast(historicalData: Array<{ date: string; value: number }>, periods = 12) {
  const avg = historicalData.reduce((sum, d) => sum + d.value, 0) / historicalData.length
  const trend = (historicalData[historicalData.length - 1].value - historicalData[0].value) / historicalData.length

  return Array.from({ length: periods }, (_, i) => ({
    date: new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    forecast: Math.max(0, avg + trend * (i + 1)),
    confidence_upper: Math.max(0, avg + trend * (i + 1) * 1.2),
    confidence_lower: Math.max(0, avg + trend * (i + 1) * 0.8),
  }))
}

// Cohort analysis
export function cohortAnalysis(
  data: Array<{ user_id: string; signup_date: string; revenue: number; activity_date: string }>,
) {
  const cohorts = new Map()

  data.forEach((record) => {
    const cohort = record.signup_date.substring(0, 7) // Year-Month
    if (!cohorts.has(cohort)) {
      cohorts.set(cohort, [])
    }
    cohorts.get(cohort).push(record)
  })

  return Array.from(cohorts.entries()).map(([cohort, records]) => ({
    cohort,
    size: records.length,
    revenue: records.reduce((sum, r) => sum + r.revenue, 0),
    activeUsers: new Set(records.map((r) => r.user_id)).size,
  }))
}

// RFM (Recency, Frequency, Monetary) Segmentation
export function rfmSegmentation(transactions: any[]) {
  const customers = new Map()

  transactions.forEach((t) => {
    if (!customers.has(t.customer_id)) {
      customers.set(t.customer_id, {
        recency: Date.now() - new Date(t.date).getTime(),
        frequency: 0,
        monetary: 0,
      })
    }
    const customer = customers.get(t.customer_id)
    customer.frequency++
    customer.monetary += t.amount
  })

  return Array.from(customers.entries()).map(([id, metrics]) => ({
    customerId: id,
    rfmScore:
      5 -
      Math.ceil(metrics.recency / (30 * 24 * 60 * 60 * 1000)) +
      (metrics.frequency > 10 ? 5 : Math.ceil(metrics.frequency / 2)) +
      (metrics.monetary > 10000 ? 5 : Math.ceil(metrics.monetary / 2000)),
    segment:
      metrics.frequency > 10 && metrics.monetary > 5000
        ? "VIP"
        : metrics.frequency > 5
          ? "Loyal"
          : metrics.frequency > 1
            ? "Repeat"
            : "New",
  }))
}

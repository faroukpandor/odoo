import { generateText } from "ai"

export interface Prediction {
  metric: string
  value: number
  trend: "up" | "down" | "stable"
  confidence: number
  recommendation: string
}

// AI-powered predictions for revenue, inventory, and cash flow
export async function predictRevenueTrend(
  historicalData: Array<{ date: string; amount: number }>,
  organizationId: string,
): Promise<Prediction> {
  const dataContext = historicalData
    .slice(-12)
    .map((d) => `${d.date}: $${d.amount}`)
    .join("\n")

  const { text } = await generateText({
    model: "grok-4",
    prompt: `Analyze this 12-month revenue trend and predict next month. Be concise.
    
${dataContext}

Respond with JSON: { trend: "up|down|stable", predictedGrowth: number (%), confidence: 0-100, actionItem: "recommendation" }`,
  })

  try {
    const result = JSON.parse(text)
    return {
      metric: "Revenue Trend",
      value: result.predictedGrowth,
      trend: result.trend,
      confidence: result.confidence,
      recommendation: result.actionItem,
    }
  } catch {
    return {
      metric: "Revenue Trend",
      value: 0,
      trend: "stable",
      confidence: 0,
      recommendation: "Insufficient data",
    }
  }
}

// Inventory optimization predictions
export async function optimizeInventory(
  inventory: Array<{ name: string; stock: number; reorderLevel: number; monthlySales: number }>,
): Promise<string> {
  const { text } = await generateText({
    model: "grok-4",
    prompt: `Analyze this inventory and suggest optimizations to reduce waste and prevent stockouts:
    
${inventory.map((i) => `${i.name}: Stock=${i.stock}, Reorder=${i.reorderLevel}, Monthly Sales=${i.monthlySales}`).join("\n")}

Provide 3 actionable recommendations.`,
  })

  return text
}

// Cash flow forecast
export async function forecastCashFlow(
  invoices: Array<{ dueDate: string; amount: number; status: string }>,
  expenses: Array<{ dueDate: string; amount: number }>,
): Promise<Prediction> {
  const { text } = await generateText({
    model: "grok-4",
    prompt: `Based on upcoming invoices and expenses, forecast cash flow for next 30 days. Be concise.
    
Invoices: ${invoices.map((i) => `${i.dueDate}: $${i.amount} (${i.status})`).join(", ")}
Expenses: ${expenses.map((e) => `${e.dueDate}: $${e.amount}`).join(", ")}

Respond with JSON: { riskLevel: "low|medium|high", projectedBalance: number, actionItem: "recommendation" }`,
  })

  try {
    const result = JSON.parse(text)
    return {
      metric: "Cash Flow",
      value: result.projectedBalance,
      trend: result.riskLevel === "high" ? "down" : "up",
      confidence: 85,
      recommendation: result.actionItem,
    }
  } catch {
    return {
      metric: "Cash Flow",
      value: 0,
      trend: "stable",
      confidence: 0,
      recommendation: "Unable to forecast",
    }
  }
}

// Smart business recommendations
export async function getBusinessInsights(businessMetrics: {
  revenue: number
  customers: number
  avgOrderValue: number
  inventory: number
}): Promise<string[]> {
  const { text } = await generateText({
    model: "grok-4",
    prompt: `As an expert business consultant, analyze these metrics and provide 5 specific, actionable recommendations:
    
Revenue: $${businessMetrics.revenue}
Customers: ${businessMetrics.customers}
Avg Order Value: $${businessMetrics.avgOrderValue}
Inventory Value: $${businessMetrics.inventory}

Format as numbered list. Be specific and data-driven.`,
  })

  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .slice(0, 5)
}

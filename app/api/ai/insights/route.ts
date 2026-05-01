import { generateText } from "ai"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { metrics, businessData } = await request.json()

    const prompt = `You are an expert business analyst. Analyze the following business metrics and provide actionable insights and forecasts.

Business Metrics:
- Revenue: ${metrics.revenue}
- Customer Count: ${metrics.customers}
- Order Count: ${metrics.orders}
- Inventory Items: ${metrics.inventory}

Business Context:
${JSON.stringify(businessData, null, 2)}

Provide:
1. Key Performance Analysis (2-3 sentences)
2. Risk Assessment (2-3 sentences)
3. Growth Opportunities (2-3 sentences)
4. 30-day Revenue Forecast
5. Recommended Actions (3 specific actions)

Format as JSON with keys: analysis, risks, opportunities, forecast, actions`

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt,
      temperature: 0.7,
    })

    try {
      const insights = JSON.parse(text)
      return NextResponse.json(insights)
    } catch {
      return NextResponse.json({ raw_analysis: text })
    }
  } catch (error) {
    console.error("AI insights error:", error)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}

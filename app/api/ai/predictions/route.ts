import { type NextRequest, NextResponse } from "next/server"
import { predictRevenueTrend, optimizeInventory, forecastCashFlow, getBusinessInsights } from "@/lib/ai/predictor"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, organizationId, data } = body

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      },
    )

    // Fetch org data from database
    const { data: orgData } = await supabase.from("organizations").select("*").eq("id", organizationId).single()

    if (!orgData) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    let prediction

    switch (type) {
      case "revenue":
        prediction = await predictRevenueTrend(data, organizationId)
        break
      case "inventory":
        prediction = await optimizeInventory(data).then((text) => ({
          recommendation: text,
          confidence: 90,
        }))
        break
      case "cashflow":
        prediction = await forecastCashFlow(data.invoices, data.expenses)
        break
      case "insights":
        const insights = await getBusinessInsights(data)
        return NextResponse.json({ insights })
      default:
        return NextResponse.json({ error: "Unknown prediction type" }, { status: 400 })
    }

    return NextResponse.json(prediction)
  } catch (error) {
    console.error("[v0] Prediction error:", error)
    return NextResponse.json({ error: "Failed to generate prediction" }, { status: 500 })
  }
}

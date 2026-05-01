import { type NextRequest, NextResponse } from "next/server"
import { queryWithNaturalLanguage } from "@/lib/ai/nlq-engine"
import { createServerClient } from "@supabase/ssr"

export async function POST(request: NextRequest) {
  try {
    const { question, organizationId } = await request.json()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: { getAll: () => [], setAll: () => {} },
      },
    )

    // Get schema info
    const tables = ["customers", "invoices", "inventory", "employees", "purchase_orders", "company_settings"]

    const schema = {
      tables: tables,
      query_hint: "Always filter by organization_id to maintain data isolation",
    }

    const result = await queryWithNaturalLanguage(question, schema, organizationId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] NLQ error:", error)
    return NextResponse.json({ error: "Failed to process query" }, { status: 500 })
  }
}

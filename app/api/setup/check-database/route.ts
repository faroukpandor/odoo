import { NextResponse } from "next/server"
import { checkDatabaseHealth } from "@/lib/supabase/migrations"

export async function GET() {
  try {
    const health = await checkDatabaseHealth()
    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Check failed" }, { status: 500 })
  }
}

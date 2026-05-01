import { NextResponse } from "next/server"
import { runMigrations } from "@/lib/supabase/migrations"

export async function POST() {
  try {
    const results = await runMigrations()
    return NextResponse.json({
      success: true,
      migrations: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Migration failed" }, { status: 500 })
  }
}

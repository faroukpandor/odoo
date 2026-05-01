// API endpoint to run migrations from the UI
// POST /api/setup/migrations

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: NextRequest) {
  try {
    // Only allow internal calls
    const auth = request.headers.get("Authorization")
    if (!auth?.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      },
    )

    const { migration } = await request.json()

    // Read migration file
    const migrations: { [key: string]: string } = {
      "1": "001_create_erp_schema.sql",
      "2": "002_create_profiles_trigger.sql",
      "3": "003_seed_sample_data.sql",
    }

    const fileName = migrations[migration]
    if (!fileName) {
      return NextResponse.json({ error: "Invalid migration" }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), "scripts", fileName)
    const sql = fs.readFileSync(filePath, "utf-8")

    // Execute migration
    const { data, error } = await supabase.rpc("query", {
      query: sql,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      migration: fileName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

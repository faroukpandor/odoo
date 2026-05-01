import { createServerSupabaseClient } from "@/lib/utils/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { orgName, companyName, email, phone, currency } = body

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert([
        {
          name: orgName,
          slug: orgName.toLowerCase().replace(/\s+/g, "-"),
          owner_id: user.id,
          plan: "free",
          status: "active",
        },
      ])
      .select()
      .single()

    if (orgError) throw orgError

    // Create company settings
    const { error: settingsError } = await supabase.from("company_settings").insert([
      {
        org_id: org.id,
        company_name: companyName,
        email,
        phone,
        currency,
      },
    ])

    if (settingsError) throw settingsError

    return NextResponse.json({ org }, { status: 201 })
  } catch (error) {
    console.error("[v0] Onboarding error:", error)
    return NextResponse.json({ error: "Failed to complete onboarding" }, { status: 500 })
  }
}

import { createServerSupabaseClient, getCurrentUserOrgs } from "@/lib/utils/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const orgs = await getCurrentUserOrgs()
    return NextResponse.json(orgs)
  } catch (error) {
    console.error("[v0] Error fetching organizations:", error)
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug } = body

    const { data: org, error } = await supabase
      .from("organizations")
      .insert([
        {
          name,
          slug,
          owner_id: user.id,
          plan: "free",
          status: "active",
        },
      ])
      .select()
      .single()

    if (error) throw error

    // Create company settings
    await supabase.from("company_settings").insert([
      {
        org_id: org.id,
        company_name: name,
        currency: "USD",
      },
    ])

    return NextResponse.json(org, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating organization:", error)
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
  }
}

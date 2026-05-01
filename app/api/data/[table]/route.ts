import { createServerSupabaseClient, getCurrentOrganization } from "@/lib/utils/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { table: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const org = await getCurrentOrganization()

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") || "100"
    const offset = searchParams.get("offset") || "0"
    const filters = Object.fromEntries(searchParams.entries())
    delete filters.limit
    delete filters.offset

    let query = supabase
      .from(params.table)
      .select("*", { count: "exact" })
      .eq("org_id", org.id)
      .limit(Number.parseInt(limit))
      .offset(Number.parseInt(offset))

    // Apply additional filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      data,
      count,
      limit: Number.parseInt(limit),
      offset: Number.parseInt(offset),
    })
  } catch (error) {
    console.error("[v0] Error fetching data:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { table: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const org = await getCurrentOrganization()
    const body = await request.json()

    const { data, error } = await supabase
      .from(params.table)
      .insert([{ ...body, org_id: org.id }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating record:", error)
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { table: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const org = await getCurrentOrganization()
    const body = await request.json()
    const { id, ...updateData } = body

    const { data, error } = await supabase
      .from(params.table)
      .update(updateData)
      .eq("id", id)
      .eq("org_id", org.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error updating record:", error)
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { table: string } }) {
  try {
    const supabase = await createServerSupabaseClient()
    const org = await getCurrentOrganization()
    const body = await request.json()
    const { id } = body

    const { error } = await supabase.from(params.table).delete().eq("id", id).eq("org_id", org.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting record:", error)
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 })
  }
}

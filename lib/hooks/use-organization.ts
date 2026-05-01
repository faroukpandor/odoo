"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function useOrganization() {
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchOrg() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: org } = await supabase.from("organizations").select("*").eq("owner_id", user.id).single()

        setOrganization(org)
      } catch (error) {
        console.error("[v0] Error fetching organization:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrg()
  }, [supabase])

  return { organization, loading }
}

export function useOrganizationData(table: string, filter?: Record<string, any>) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { organization } = useOrganization()

  useEffect(() => {
    if (!organization?.id) return

    async function fetchData() {
      try {
        setLoading(true)
        let query = supabase.from(table).select("*").eq("org_id", organization.id)

        // Apply additional filters
        if (filter) {
          Object.entries(filter).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }

        const { data: result, error: err } = await query

        if (err) throw err
        setData(result || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error fetching data")
        console.error("[v0] Error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase, organization?.id, table, filter])

  return { data, loading, error }
}

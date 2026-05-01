"use client"

import { useEffect, useState, useRef } from "react"
import { useSupabaseClient } from "@/lib/supabase/client"
import { CollaborationEngine, type RealTimePresence } from "@/lib/realtime/collaboration"

export function useRealtimeUpdates(organizationId: string, table: string, onDataChange: (data: any) => void) {
  const supabase = useSupabaseClient()
  const engineRef = useRef<CollaborationEngine | null>(null)

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new CollaborationEngine(supabase)
    }

    const engine = engineRef.current
    const channel = engine.subscribeToTable(organizationId, table, (payload) => {
      console.log("[v0] Real-time update received:", payload)
      onDataChange(payload)
    })

    return () => {
      engine.unsubscribe(`org:${organizationId}:${table}`)
    }
  }, [organizationId, table, supabase])
}

export function usePresence(organizationId: string) {
  const supabase = useSupabaseClient()
  const [presence, setPresence] = useState<RealTimePresence>({ users: [] })
  const [loading, setLoading] = useState(true)
  const engineRef = useRef<CollaborationEngine | null>(null)

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new CollaborationEngine(supabase)
    }

    const engine = engineRef.current
    const channel = engine.subscribeToPresence(organizationId, (newPresence) => {
      setPresence(newPresence)
      setLoading(false)
    })

    return () => {
      engine.unsubscribe(`presence:org:${organizationId}`)
    }
  }, [organizationId, supabase])

  return { presence, loading }
}

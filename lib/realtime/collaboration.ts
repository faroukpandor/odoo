import type { RealtimeChannel } from "@supabase/supabase-js"

export interface CollaborationUpdate {
  userId: string
  userName: string
  action: "viewing" | "editing" | "commenting"
  entity: string
  entityId: string
  timestamp: number
}

export interface RealTimePresence {
  users: Array<{
    userId: string
    userName: string
    email: string
    isActive: boolean
    lastSeen: number
  }>
}

// Supabase Realtime Channel Manager
export class CollaborationEngine {
  private channels: Map<string, RealtimeChannel> = new Map()

  constructor(private supabase: any) {}

  // Subscribe to real-time changes on any table
  subscribeToTable(organizationId: string, table: string, onUpdate: (payload: any) => void) {
    const channelKey = `org:${organizationId}:${table}`

    if (this.channels.has(channelKey)) {
      return this.channels.get(channelKey)
    }

    const channel = this.supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: `organization_id=eq.${organizationId}`,
        },
        onUpdate,
      )
      .subscribe()

    this.channels.set(channelKey, channel)
    return channel
  }

  // Track user presence (who is viewing/editing what)
  subscribeToPresence(organizationId: string, onPresenceChange: (presence: RealTimePresence) => void) {
    const presenceChannel = `presence:org:${organizationId}`

    const channel = this.supabase
      .channel(presenceChannel)
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState()
        const users = Object.values(presenceState).flat() as RealTimePresence["users"]
        onPresenceChange({ users: users as any })
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: any) => {
        console.log("[v0] User joined:", key, newPresences)
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }: any) => {
        console.log("[v0] User left:", key, leftPresences)
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          // Track current user
          await channel.track({
            userId: "current-user-id",
            userName: "Current User",
            isActive: true,
            lastSeen: Date.now(),
          })
        }
      })

    this.channels.set(presenceChannel, channel)
    return channel
  }

  // Log collaboration activity
  async logActivity(organizationId: string, userId: string, activity: Omit<CollaborationUpdate, "timestamp">) {
    try {
      await this.supabase.from("collaboration_activity").insert({
        organization_id: organizationId,
        user_id: userId,
        ...activity,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("[v0] Failed to log collaboration activity:", error)
    }
  }

  // Cleanup
  unsubscribe(key: string) {
    const channel = this.channels.get(key)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(key)
    }
  }

  unsubscribeAll() {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

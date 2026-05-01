"use client"

import { useEffect, useState } from "react"
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react"

interface LiveSyncIndicatorProps {
  isConnected: boolean
  isSyncing: boolean
  lastSync?: Date
}

export function LiveSyncIndicator({ isConnected, isSyncing, lastSync }: LiveSyncIndicatorProps) {
  const [showSync, setShowSync] = useState(false)

  useEffect(() => {
    if (isSyncing) {
      setShowSync(true)
      const timer = setTimeout(() => setShowSync(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isSyncing])

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/20 border border-red-700/50">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-300">Offline</span>
      </div>
    )
  }

  if (showSync) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/20 border border-blue-700/50 animate-pulse">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-xs text-blue-300">Syncing...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-900/20 border border-green-700/50">
      <CheckCircle2 className="w-4 h-4 text-green-400" />
      <span className="text-xs text-green-300">Synced</span>
    </div>
  )
}

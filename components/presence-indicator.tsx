"use client"

import { usePresence } from "@/lib/hooks/use-realtime"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PresenceIndicatorProps {
  organizationId: string
}

export function PresenceIndicator({ organizationId }: PresenceIndicatorProps) {
  const { presence, loading } = usePresence(organizationId)

  if (loading || presence.users.length === 0) {
    return null
  }

  const activeUsers = presence.users.filter((u) => u.isActive)

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Active now:</span>
        <div className="flex -space-x-2">
          {activeUsers.slice(0, 3).map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-slate-700 bg-blue-600/20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    {user.userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-800 border-slate-700">
                <p className="text-sm">{user.userName}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {activeUsers.length > 3 && (
            <div className="h-8 w-8 rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center">
              <span className="text-xs text-slate-300">+{activeUsers.length - 3}</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

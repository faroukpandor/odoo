"use client"

import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"
import type { Toast } from "@/lib/hooks/use-toast"

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
  }

  const bgColors = {
    success: "bg-green-950/50 border-green-500/30",
    error: "bg-red-950/50 border-red-500/30",
    info: "bg-blue-950/50 border-blue-500/30",
    warning: "bg-yellow-950/50 border-yellow-500/30",
  }

  const textColors = {
    success: "text-green-200",
    error: "text-red-200",
    info: "text-blue-200",
    warning: "text-yellow-200",
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg border ${bgColors[toast.type]} animate-in fade-in slide-in-from-right`}
        >
          {icons[toast.type]}
          <p className={`flex-1 text-sm ${textColors[toast.type]}`}>{toast.message}</p>
          <button onClick={() => onRemove(toast.id)} className="text-slate-400 hover:text-slate-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

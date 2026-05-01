"use client"

import { useState, useCallback } from "react"

export interface Toast {
  id: string
  message: string
  type: "success" | "error" | "info" | "warning"
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: "success" | "error" | "info" | "warning" = "info") => {
    const id = Math.random().toString(36).substr(2, 9)
    const toast: Toast = { id, message, type, duration: 3000 }

    setToasts((prev) => [...prev, toast])

    if (toast.duration) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, toast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}

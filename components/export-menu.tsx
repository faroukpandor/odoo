"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { exportToCSV, exportToJSON } from "@/lib/utils/export"
import { Download, ChevronDown } from "lucide-react"
import { useState } from "react"

interface ExportMenuProps<T> {
  data: T[]
  filename: string
  label?: string
}

export function ExportMenu<T>({ data, filename, label = "Export" }: ExportMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        {label}
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <Card className="absolute right-0 mt-2 z-50 border-slate-700 bg-slate-900 w-40">
            <div className="p-2 space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-50 hover:bg-slate-800"
                onClick={() => {
                  exportToCSV(data, filename)
                  setIsOpen(false)
                }}
              >
                Export as CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-50 hover:bg-slate-800"
                onClick={() => {
                  exportToJSON(data, filename)
                  setIsOpen(false)
                }}
              >
                Export as JSON
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MigrationStatus {
  id: string
  name: string
  status: "success" | "error" | "pending"
  error?: string
}

export function SetupStatus() {
  const [status, setStatus] = useState<"idle" | "checking" | "running" | "complete" | "error">("idle")
  const [migrations, setMigrations] = useState<MigrationStatus[]>([])
  const [databaseHealthy, setDatabaseHealthy] = useState(false)

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    try {
      setStatus("checking")
      const response = await fetch("/api/setup/check-database")
      const data = await response.json()

      if (data.healthy) {
        setDatabaseHealthy(true)
        setStatus("complete")
      } else {
        setStatus("idle")
      }
    } catch {
      setStatus("idle")
    }
  }

  const runMigrations = async () => {
    try {
      setStatus("running")
      const response = await fetch("/api/setup/run-migrations", {
        method: "POST",
      })
      const data = await response.json()

      setMigrations(data.migrations)
      setStatus(data.migrations.every((m: MigrationStatus) => m.status === "success") ? "complete" : "error")
      setDatabaseHealthy(true)
    } catch {
      setStatus("error")
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <CardTitle>Database Setup</CardTitle>
        <CardDescription>{databaseHealthy ? "Database is ready" : "Initialize your ERP database"}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {databaseHealthy ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm text-slate-200">All systems operational</span>
            </div>
            <Button onClick={checkDatabase} className="w-full">
              Verify Status
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Click below to automatically initialize all ERP database tables with Row Level Security.
            </p>
            <Button
              onClick={runMigrations}
              disabled={status === "running"}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {status === "running" ? "Setting up database..." : "Initialize Database"}
            </Button>
          </div>
        )}

        {migrations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Migration Results:</h3>
            {migrations.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">{m.name}</p>
                  {m.error && <p className="text-xs text-red-400">{m.error}</p>}
                </div>
                <Badge variant={m.status === "success" ? "default" : "destructive"}>{m.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Building2, Zap } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: org } = await supabase.from("organizations").select("*").eq("owner_id", user.id).single()

      if (org) {
        const { data: companySettings } = await supabase
          .from("company_settings")
          .select("*")
          .eq("org_id", org.id)
          .single()

        setSettings(companySettings || {})
      }
    } catch (error) {
      console.error("[v0] Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    try {
      setSaving(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: org } = await supabase.from("organizations").select("id").eq("owner_id", user.id).single()

      const { error } = await supabase.from("company_settings").update(settings).eq("org_id", org.id)

      if (error) throw error
      alert("Settings saved successfully")
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      alert("Error saving settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="animate-pulse h-64 bg-slate-800 rounded" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your organization and preferences</p>
      </div>

      <Card className="border-slate-700 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-50">
            <Building2 className="w-5 h-5" /> Organization Settings
          </CardTitle>
          <CardDescription className="text-slate-400">Update your company information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-50 mb-2 block">Company Name</label>
              <Input
                value={settings?.company_name || ""}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-50 mb-2 block">Email</label>
              <Input
                value={settings?.email || ""}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                type="email"
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-50 mb-2 block">Phone</label>
              <Input
                value={settings?.phone || ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-50 mb-2 block">Currency</label>
              <select
                value={settings?.currency || "USD"}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-50"
              >
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
                <option>CAD</option>
                <option>AUD</option>
              </select>
            </div>
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <Zap className="w-5 h-5" /> Getting Started
          </CardTitle>
          <CardDescription className="text-blue-300">Tips to get the most out of Nexus ERP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-blue-200 text-sm">
          <p>✓ Complete your company information above</p>
          <p>✓ Add your first customers in the CRM module</p>
          <p>✓ Create invoices to track revenue</p>
          <p>✓ Manage inventory to optimize stock levels</p>
          <p>✓ Add employees and track payroll</p>
        </CardContent>
      </Card>
    </div>
  )
}

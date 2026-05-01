"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, ArrowRight } from "lucide-react"

export function SetupWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    orgName: "",
    companyName: "",
    email: "",
    phone: "",
    currency: "USD",
  })
  const router = useRouter()
  const supabase = createClient()

  async function handleNext() {
    if (step === 1) {
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      await completeSetup()
    }
  }

  async function completeSetup() {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert([
          {
            name: formData.orgName,
            slug: formData.orgName.toLowerCase().replace(/\s+/g, "-"),
            owner_id: user.id,
            plan: "free",
            status: "active",
          },
        ])
        .select()
        .single()

      if (orgError) throw orgError

      // Create company settings
      const { error: settingsError } = await supabase.from("company_settings").insert([
        {
          org_id: org.id,
          company_name: formData.companyName,
          email: formData.email,
          phone: formData.phone,
          currency: formData.currency,
        },
      ])

      if (settingsError) throw settingsError

      router.push("/dashboard")
    } catch (error) {
      console.error("[v0] Setup error:", error)
      alert("Error completing setup. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: "Organization",
      description: "Create your first organization",
      fields: ["orgName"],
    },
    {
      title: "Company Info",
      description: "Tell us about your company",
      fields: ["companyName", "email", "phone"],
    },
    {
      title: "Preferences",
      description: "Choose your default settings",
      fields: ["currency"],
    },
  ]

  const currentStep = steps[step - 1]

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/50">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl text-slate-50">{currentStep.title}</CardTitle>
              <p className="text-slate-400 text-sm">{currentStep.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${i < step ? "bg-blue-500" : "bg-slate-700"}`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <Input
              label="Organization Name"
              placeholder="My Company Inc"
              value={formData.orgName}
              onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
              className="bg-slate-800 border-slate-700 text-slate-50"
            />
          )}

          {step === 2 && (
            <>
              <Input
                label="Company Name"
                placeholder="Legal company name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
              <Input
                label="Email"
                type="email"
                placeholder="contact@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
              <Input
                label="Phone"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-slate-50"
              />
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-50 mb-2 block">Default Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-50"
                >
                  <option value="USD">USD (United States Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="CAD">CAD (Canadian Dollar)</option>
                  <option value="AUD">AUD (Australian Dollar)</option>
                  <option value="JPY">JPY (Japanese Yen)</option>
                </select>
              </div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded">
                <div className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="text-sm text-green-200">
                    <p className="font-medium mb-1">You're all set!</p>
                    <p>Your organization is ready. Let's get you started!</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-6 flex gap-2">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading} className="flex-1">
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading || (step === 1 && !formData.orgName) || (step === 2 && !formData.companyName)}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {loading ? "Setting up..." : step === 3 ? "Get Started" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

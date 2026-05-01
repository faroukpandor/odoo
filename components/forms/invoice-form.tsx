"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { invoiceSchema } from "@/lib/schemas/validation"

interface InvoiceFormProps {
  onSubmit: (data: any) => Promise<void>
  loading?: boolean
  initialData?: any
  customers?: any[]
}

export function InvoiceForm({ onSubmit, loading, initialData, customers = [] }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    invoice_number: initialData?.invoice_number || "",
    customer_id: initialData?.customer_id || "",
    amount: initialData?.amount || 0,
    tax_amount: initialData?.tax_amount || 0,
    total_amount: initialData?.total_amount || 0,
    status: initialData?.status || "draft",
    issue_date: initialData?.issue_date || new Date().toISOString().split("T")[0],
    due_date: initialData?.due_date || "",
    notes: initialData?.notes || "",
  })

  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setError(null)
      const validated = invoiceSchema.parse(formData)
      await onSubmit(validated)
      if (!initialData) {
        setFormData({
          invoice_number: "",
          customer_id: "",
          amount: 0,
          tax_amount: 0,
          total_amount: 0,
          status: "draft",
          issue_date: new Date().toISOString().split("T")[0],
          due_date: "",
          notes: "",
        })
      }
    } catch (err: any) {
      setError(err.message || "Error submitting form")
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Invoice" : "Create New Invoice"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">{error}</div>}

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Invoice Number"
              placeholder="INV-001"
              value={formData.invoice_number}
              onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              required
            />
            <div>
              <label className="text-sm font-medium text-slate-50 mb-2 block">Customer</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-50"
              >
                <option value="">Select customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number.parseFloat(e.target.value) })}
            />
            <Input
              label="Tax Amount"
              type="number"
              step="0.01"
              value={formData.tax_amount}
              onChange={(e) => setFormData({ ...formData, tax_amount: Number.parseFloat(e.target.value) })}
            />
            <Input
              label="Total"
              type="number"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => setFormData({ ...formData, total_amount: Number.parseFloat(e.target.value) })}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input
              label="Issue Date"
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            />
            <Input
              label="Due Date"
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            />
            <div>
              <label className="text-sm font-medium text-slate-50 mb-2 block">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-50"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          <Input
            label="Notes"
            placeholder="Additional notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="pt-4 flex gap-2">
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useData } from "@/lib/hooks/use-data"
import { DataTable } from "@/components/data-table"
import { ExportMenu } from "@/components/export-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function SalesPage() {
  const [showForm, setShowForm] = useState(false)
  const { data: invoices, loading } = useData<any>({ table: "invoices" })
  const { data: customers } = useData<any>({ table: "customers" })

  const totalRevenue = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const pendingAmount = invoices
    .filter((inv) => inv.status === "pending")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  const overdueAmount = invoices
    .filter((inv) => inv.status === "overdue")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Sales & Invoicing</h1>
          <p className="text-slate-400 mt-1">Create and manage your invoices</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu data={invoices} filename="invoices" />
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-blue-500 to-purple-600">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-slate-50">${totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Pending Payment</p>
            <p className="text-3xl font-bold text-yellow-500">${pendingAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Overdue</p>
            <p className="text-3xl font-bold text-red-500">${overdueAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable<any>
        data={invoices}
        columns={[
          { key: "invoice_number" as const, label: "Invoice" },
          { key: "customer_id" as const, label: "Customer", render: (value) => value || "N/A" },
          {
            key: "total_amount" as const,
            label: "Amount",
            render: (value) => `$${(value || 0).toLocaleString()}`,
          },
          {
            key: "issue_date" as const,
            label: "Date",
            render: (value) => (value ? new Date(value).toLocaleDateString() : "N/A"),
          },
          { key: "status" as const, label: "Status" },
        ]}
        title="Recent Invoices"
        loading={loading}
      />
    </div>
  )
}

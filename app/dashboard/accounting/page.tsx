"use client"

import { useData } from "@/lib/hooks/use-data"
import { DataTable } from "@/components/data-table"
import { Card, CardContent } from "@/components/ui/card"

export default function AccountingPage() {
  const { data: invoices, loading: invoicesLoading } = useData<any>({ table: "invoices" })
  const { data: purchases, loading: purchasesLoading } = useData<any>({ table: "purchase_orders" })
  const { data: payroll, loading: payrollLoading } = useData<any>({ table: "payroll" })

  const totalIncome = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

  const totalExpenses =
    purchases.reduce((sum, po) => sum + (po.total_amount || 0), 0) +
    payroll.reduce((sum, p) => sum + (p.net_amount || 0), 0)

  const netProfit = totalIncome - totalExpenses

  const allTransactions = [
    ...invoices.map((inv) => ({
      id: inv.id,
      type: "income",
      description: `Invoice ${inv.invoice_number}`,
      amount: inv.total_amount,
      date: inv.issue_date,
    })),
    ...purchases.map((po) => ({
      id: po.id,
      type: "expense",
      description: `Purchase Order ${po.po_number}`,
      amount: -po.total_amount,
      date: po.order_date,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Accounting & Finance</h1>
        <p className="text-slate-400 mt-1">Manage your financial records</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Total Income</p>
            <p className="text-3xl font-bold text-green-400">${totalIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Total Expenses</p>
            <p className="text-3xl font-bold text-red-400">${totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Net Profit</p>
            <p className={`text-3xl font-bold ${netProfit >= 0 ? "text-blue-400" : "text-red-400"}`}>
              ${netProfit.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable<any>
        data={allTransactions}
        columns={[
          { key: "description" as const, label: "Description" },
          {
            key: "amount" as const,
            label: "Amount",
            render: (value) => (
              <span className={value >= 0 ? "text-green-400" : "text-red-400"}>
                {value >= 0 ? "+" : ""}${Math.abs(value).toLocaleString()}
              </span>
            ),
          },
          {
            key: "date" as const,
            label: "Date",
            render: (value) => (value ? new Date(value).toLocaleDateString() : "N/A"),
          },
        ]}
        title="Transaction History"
        loading={invoicesLoading || purchasesLoading || payrollLoading}
        searchable={true}
      />
    </div>
  )
}

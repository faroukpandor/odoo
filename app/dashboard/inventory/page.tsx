"use client"

import { useData } from "@/lib/hooks/use-data"
import { DataTable } from "@/components/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function InventoryPage() {
  const { data: items, loading } = useData<any>({ table: "inventory_items" })

  const criticalItems = items.filter((item) => item.quantity_on_hand <= item.reorder_level)
  const totalValue = items.reduce((sum, item) => sum + (item.quantity_on_hand || 0) * (item.unit_price || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Inventory Management</h1>
        <p className="text-slate-400 mt-1">Track stock levels in real-time</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Total Items</p>
            <p className="text-3xl font-bold text-slate-50">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Critical Stock</p>
            <p className="text-3xl font-bold text-red-500">{criticalItems.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Stock Value</p>
            <p className="text-3xl font-bold text-slate-50">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {criticalItems.length > 0 && (
        <Card className="border-red-500/20 bg-red-950/10 border-2">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-400">Low Stock Alert</p>
              <p className="text-sm text-red-300 mt-1">{criticalItems.length} items below reorder level</p>
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable<any>
        data={items}
        columns={[
          { key: "sku" as const, label: "SKU" },
          { key: "name" as const, label: "Product" },
          { key: "quantity_on_hand" as const, label: "Quantity" },
          { key: "reorder_level" as const, label: "Reorder Level" },
          {
            key: "quantity_on_hand" as const,
            label: "Status",
            render: (value, row: any) => (value <= row.reorder_level ? "Critical" : "Healthy"),
          },
        ]}
        title="Inventory Items"
        loading={loading}
      />
    </div>
  )
}

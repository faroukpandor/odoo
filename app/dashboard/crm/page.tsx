"use client"

import { useState } from "react"
import { useData } from "@/lib/hooks/use-data"
import { DataTable } from "@/components/data-table"
import { CustomerForm } from "@/components/forms/customer-form"
import { Button } from "@/components/ui/button"

export default function CRMPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const {
    data,
    loading,
    create,
    update,
    delete: deleteRecord,
    refetch,
  } = useData<any>({
    table: "customers",
  })

  async function handleSubmit(formData: any) {
    try {
      if (editingCustomer) {
        await update(editingCustomer.id, formData)
      } else {
        await create(formData)
      }
      setShowForm(false)
      setEditingCustomer(null)
      refetch()
    } catch (error) {
      console.error("[v0] Error:", error)
    }
  }

  function handleEdit(customer: any) {
    setEditingCustomer(customer)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (confirm("Are you sure?")) {
      deleteRecord(id).then(() => refetch())
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Customer Relationship Management</h1>
          <p className="text-slate-400 mt-1">Manage all your customer interactions</p>
        </div>
      </div>

      {showForm ? (
        <div>
          <Button
            variant="outline"
            onClick={() => {
              setShowForm(false)
              setEditingCustomer(null)
            }}
            className="mb-4"
          >
            Back
          </Button>
          <CustomerForm onSubmit={handleSubmit} initialData={editingCustomer} />
        </div>
      ) : (
        <>
          <DataTable<any>
            data={data}
            columns={[
              { key: "name" as const, label: "Name" },
              { key: "email" as const, label: "Email" },
              { key: "company" as const, label: "Company" },
              {
                key: "lifetime_value" as const,
                label: "Lifetime Value",
                render: (value) => `$${(value || 0).toLocaleString()}`,
              },
              { key: "status" as const, label: "Status" },
            ]}
            title="All Customers"
            description={`Total: ${data.length} customers`}
            loading={loading}
            onAdd={() => {
              setEditingCustomer(null)
              setShowForm(true)
            }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            addButtonLabel="Add Customer"
          />
        </>
      )}
    </div>
  )
}

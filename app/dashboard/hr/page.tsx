"use client"
import { useData } from "@/lib/hooks/use-data"
import { DataTable } from "@/components/data-table"
import { Card, CardContent } from "@/components/ui/card"

export default function HRPage() {
  const { data: employees, loading } = useData<any>({ table: "employees" })

  const totalEmployees = employees.length
  const activeEmployees = employees.filter((e) => e.status === "active").length
  const departments = new Set(employees.map((e) => e.department)).size
  const monthlyPayroll = employees.reduce((sum, emp) => sum + (emp.salary || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Human Resources</h1>
        <p className="text-slate-400 mt-1">Manage employees and payroll</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Total Employees</p>
            <p className="text-3xl font-bold text-slate-50">{totalEmployees}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Active</p>
            <p className="text-3xl font-bold text-green-400">{activeEmployees}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Departments</p>
            <p className="text-3xl font-bold text-slate-50">{departments}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-700 bg-slate-900/50">
          <CardContent className="pt-6">
            <p className="text-slate-400 text-sm mb-1">Monthly Payroll</p>
            <p className="text-3xl font-bold text-slate-50">${monthlyPayroll.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <DataTable<any>
        data={employees}
        columns={[
          { key: "name" as const, label: "Name" },
          { key: "position" as const, label: "Position" },
          { key: "department" as const, label: "Department" },
          {
            key: "salary" as const,
            label: "Salary",
            render: (value) => `$${(value || 0).toLocaleString()}`,
          },
          { key: "status" as const, label: "Status" },
        ]}
        title="Employee Directory"
        description={`Total: ${totalEmployees} employees`}
        loading={loading}
        searchable={true}
      />
    </div>
  )
}

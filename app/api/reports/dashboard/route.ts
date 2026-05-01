import { createServerSupabaseClient, getCurrentOrganization } from "@/lib/utils/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const org = await getCurrentOrganization()

    // Fetch all metrics in parallel
    const [invoices, customers, inventory, employees, payroll] = await Promise.all([
      supabase.from("invoices").select("*").eq("org_id", org.id),
      supabase.from("customers").select("*").eq("org_id", org.id),
      supabase.from("inventory_items").select("*").eq("org_id", org.id),
      supabase.from("employees").select("*").eq("org_id", org.id),
      supabase.from("payroll").select("*").eq("org_id", org.id),
    ])

    // Calculate metrics
    const totalRevenue = invoices.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0
    const paidInvoices = invoices.data?.filter((inv) => inv.status === "paid").length || 0
    const pendingInvoices = invoices.data?.filter((inv) => inv.status === "pending").length || 0
    const overdueInvoices = invoices.data?.filter((inv) => inv.status === "overdue").length || 0

    const lowStockItems = inventory.data?.filter((item) => item.quantity_on_hand <= item.reorder_level) || []

    const totalPayroll = payroll.data?.reduce((sum, p) => sum + (p.net_amount || 0), 0) || 0

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        paid: paidInvoices,
        pending: pendingInvoices,
        overdue: overdueInvoices,
      },
      customers: {
        total: customers.data?.length || 0,
        active: customers.data?.filter((c) => c.status === "active").length || 0,
      },
      inventory: {
        total: inventory.data?.length || 0,
        lowStock: lowStockItems.length,
        items:
          inventory.data?.map((item) => ({
            id: item.id,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity_on_hand,
            reorderLevel: item.reorder_level,
            value: (item.quantity_on_hand || 0) * (item.unit_price || 0),
          })) || [],
      },
      employees: {
        total: employees.data?.length || 0,
        active: employees.data?.filter((e) => e.status === "active").length || 0,
      },
      payroll: {
        totalNetAmount: totalPayroll,
        pendingPayrolls: payroll.data?.filter((p) => p.status === "draft").length || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching dashboard metrics:", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

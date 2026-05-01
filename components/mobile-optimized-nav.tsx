"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, Users, ShoppingCart, BarChart3, Settings, Package, FileText } from "lucide-react"

const mobileMenuItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "CRM", href: "/dashboard/crm" },
  { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales" },
  { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
  { icon: FileText, label: "Accounting", href: "/dashboard/accounting" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function MobileOptimizedNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 lg:hidden">
      <div className="flex justify-around items-center h-16">
        {mobileMenuItems.slice(0, 5).map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 ${
                isActive ? "text-blue-400" : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

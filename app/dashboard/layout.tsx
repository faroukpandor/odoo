"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LayoutGrid, Users, ShoppingCart, BarChart3, Settings, LogOut, Menu, X, FileText, Package } from "lucide-react"

const menuItems = [
  { icon: LayoutGrid, label: "Dashboard", href: "/dashboard", badge: null },
  { icon: Users, label: "CRM", href: "/dashboard/crm", badge: null },
  { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales", badge: "3" },
  { icon: Package, label: "Inventory", href: "/dashboard/inventory", badge: null },
  { icon: FileText, label: "Accounting", href: "/dashboard/accounting", badge: "5" },
  { icon: Users, label: "HR", href: "/dashboard/hr", badge: null },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics", badge: null },
  { icon: Settings, label: "Settings", href: "/dashboard/settings", badge: null },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-mesh text-slate-50 flex">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 glass-darker transform transition-transform lg:relative lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-emerald-500 rounded-lg" />
            <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Nexus
            </span>
          </div>

          <div className="glass-dark p-3 text-sm">
            <p className="text-slate-400 text-xs mb-2">Organization</p>
            <select className="w-full bg-slate-900/50 border border-slate-600/50 rounded-lg px-3 py-2 text-slate-50 text-sm focus:outline-none focus:border-blue-500/50 transition-colors">
              <option>My Company</option>
            </select>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:glass-dark transition-all group duration-200"
              >
                <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
                <span className="flex-1 text-slate-300 group-hover:text-slate-50 transition-colors">{item.label}</span>
                {item.badge && (
                  <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 glass-darker">
          <Button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-slate-300 hover:text-slate-50 hover:glass-dark justify-start bg-slate-900/30 hover:bg-slate-800/50 border border-slate-700/50"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <div className="glass-darker p-6 flex items-center justify-between lg:hidden border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
            <span className="font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Nexus
            </span>
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-slate-50 transition-colors">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Page Content */}
        <main className="p-6 lg:p-8">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      )}
    </div>
  )
}

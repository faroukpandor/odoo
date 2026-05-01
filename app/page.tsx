"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  ArrowRight, 
  BarChart3, 
  Users, 
  Zap, 
  Shield, 
  Cloud, 
  Sparkles 
} from "lucide-react"

interface Feature {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
}

export default function LandingPage() {
  const features: Feature[] = [
    { icon: Zap, title: "Lightning Fast", desc: "Built on Vercel's serverless for instant performance" },
    { icon: BarChart3, title: "Real-Time Insights", desc: "AI-powered analytics and forecasting" },
    { icon: Users, title: "Multi-Tenant", desc: "Unlimited teams, unlimited organizations" },
    { icon: Shield, title: "Enterprise Security", desc: "Row-level security and compliance ready" },
    { icon: Cloud, title: "Cloud Native", desc: "Always available, always synced" },
    { icon: Sparkles, title: "AI-First Design", desc: "Smart recommendations and automations" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
          <span className="font-bold text-xl">Nexus ERP</span>
        </div>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <Button variant="ghost" className="text-slate-300 hover:text-slate-50 hover:bg-slate-800">
              Login
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 md:py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-8 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-slate-300">
              AI-powered enterprise management, built on modern infrastructure
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Enterprise ERP Reimagined
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Nexus is the ERP system that disrupts Odoo, SAP, and Microsoft Dynamics. Lightning-fast, beautifully
            designed, and powered by AI. No bloat. No complexity. Pure innovation.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Link href="/auth/sign-up">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8"
              >
                Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-50 bg-transparent"
            >
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 py-20">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="p-6 rounded-xl bg-slate-800/30 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
              >
                <Icon className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-bold">Ready to Transform Your Business?</h2>
          <p className="text-xl text-slate-400">
            Join forward-thinking enterprises using Nexus to run their entire business
          </p>
          <Link href="/auth/sign-up">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg px-8"
            >
              Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

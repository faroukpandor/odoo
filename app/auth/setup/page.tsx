import { SetupStatus } from "@/components/setup-status"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-50">Welcome to Nexus ERP</h1>
          <p className="text-slate-400">Let's set up your enterprise system</p>
        </div>

        <SetupStatus />

        <div className="text-center">
          <p className="text-sm text-slate-400 mb-4">Ready to get started?</p>
          <Link href="/dashboard">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

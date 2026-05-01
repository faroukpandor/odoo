"use client"

import { useState } from "react"
import { Plus, Trash2, ToggleLeft as Toggle2 } from "lucide-react"
import { ModernCard, ModernCardContent } from "@/components/ui/modern-card"
import { Button } from "@/components/ui/button"
import { defaultWorkflows } from "@/lib/workflows/automation-engine"

export function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState(defaultWorkflows)

  const toggleWorkflow = (id: string) => {
    setWorkflows(workflows.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-50">Automation Workflows</h3>
        <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600">
          <Plus className="w-4 h-4 mr-2" /> New Workflow
        </Button>
      </div>

      <div className="space-y-3">
        {workflows.map((workflow) => (
          <ModernCard key={workflow.id} variant="interactive">
            <ModernCardContent className="flex items-center justify-between py-4">
              <div className="flex-1">
                <p className="font-medium text-slate-50">{workflow.name}</p>
                <p className="text-sm text-slate-400">
                  {workflow.triggers.length} triggers, {workflow.actions.length} actions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleWorkflow(workflow.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    workflow.enabled ? "bg-green-500/20 text-green-400" : "bg-slate-700/20 text-slate-400"
                  }`}
                >
                  <Toggle2 className="w-5 h-5" />
                </button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </ModernCardContent>
          </ModernCard>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import { Search, Sparkles, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModernCard, ModernCardContent } from "@/components/ui/modern-card"

interface NLQSearchProps {
  organizationId: string
}

export function NLQSearch({ organizationId }: NLQSearchProps) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const exampleQueries = [
    "What are my top 5 customers by revenue?",
    "Show me inventory items below reorder level",
    "How much revenue did I make last month?",
    "Which employees have pending payroll?",
    "Forecast next month's revenue",
  ]

  async function handleQuery() {
    if (!query.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/nlq/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, organizationId }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error("[v0] Query failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-dark p-4 rounded-lg border border-slate-700/50">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery()}
              placeholder="Ask anything about your business..."
              className="w-full bg-transparent pl-10 pr-4 py-2 outline-none text-slate-50 placeholder-slate-400"
            />
          </div>
          <Button
            onClick={handleQuery}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {loading ? "..." : <Sparkles className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {result && (
        <ModernCard>
          <ModernCardContent className="pt-6">
            <p className="text-slate-300 mb-4">{result.natural_response}</p>
            {result.sql && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300">View SQL Query</summary>
                <pre className="mt-2 p-3 bg-slate-900/50 rounded border border-slate-700/50 text-xs text-slate-300 overflow-x-auto">
                  {result.sql}
                </pre>
              </details>
            )}
          </ModernCardContent>
        </ModernCard>
      )}

      <div className="grid grid-cols-2 gap-2">
        {exampleQueries.map((example, i) => (
          <button
            key={i}
            onClick={() => {
              setQuery(example)
              setTimeout(handleQuery, 0)
            }}
            className="text-left text-xs p-3 glass-dark hover:glass rounded-lg border border-slate-700/50 text-slate-300 hover:text-slate-50 transition-all"
          >
            <TrendingUp className="w-3 h-3 mb-1 text-blue-400" />
            {example}
          </button>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useCallback, useEffect } from "react"

interface UseDataOptions {
  table: string
  limit?: number
  offset?: number
  filter?: Record<string, any>
}

interface UseDataResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  create: (data: Omit<T, "id" | "org_id" | "created_at" | "updated_at">) => Promise<T>
  update: (id: string, data: Partial<T>) => Promise<T>
  delete: (id: string) => Promise<void>
  totalCount: number
}

export function useData<T>({ table, limit = 100, offset = 0, filter }: UseDataOptions): UseDataResult<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() })
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          params.append(key, String(value))
        })
      }

      const response = await fetch(`/api/data/${table}?${params}`)
      if (!response.ok) throw new Error("Failed to fetch data")

      const result = await response.json()
      setData(result.data)
      setTotalCount(result.count)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching data")
      console.error("[v0] Error fetching data:", err)
    } finally {
      setLoading(false)
    }
  }, [table, limit, offset, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const create = useCallback(
    async (newData: Omit<T, "id" | "org_id" | "created_at" | "updated_at">) => {
      try {
        const response = await fetch(`/api/data/${table}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newData),
        })
        if (!response.ok) throw new Error("Failed to create record")

        const result = await response.json()
        setData((prev) => [result, ...prev])
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error creating record"
        setError(message)
        throw err
      }
    },
    [table],
  )

  const update = useCallback(
    async (id: string, updateData: Partial<T>) => {
      try {
        const response = await fetch(`/api/data/${table}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updateData }),
        })
        if (!response.ok) throw new Error("Failed to update record")

        const result = await response.json()
        setData((prev) => prev.map((item: any) => (item.id === id ? result : item)))
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error updating record"
        setError(message)
        throw err
      }
    },
    [table],
  )

  const deleteRecord = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/data/${table}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        })
        if (!response.ok) throw new Error("Failed to delete record")

        setData((prev) => prev.filter((item: any) => item.id !== id))
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error deleting record"
        setError(message)
        throw err
      }
    },
    [table],
  )

  return { data, loading, error, refetch: fetchData, create, update, delete: deleteRecord, totalCount }
}

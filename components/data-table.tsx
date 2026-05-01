"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Edit2, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface Column<T> {
  key: keyof T
  label: string
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  title: string
  description?: string
  loading?: boolean
  onAdd?: () => void
  onEdit?: (row: T) => void
  onDelete?: (id: string) => void
  addButtonLabel?: string
  searchable?: boolean
  pagination?: {
    total: number
    currentPage: number
    pageSize: number
    onPageChange: (page: number) => void
  }
}

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  title,
  description,
  loading,
  onAdd,
  onEdit,
  onDelete,
  addButtonLabel = "Add New",
  searchable = true,
  pagination,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredData = searchable
    ? data.filter((row) =>
        columns.some((col) => {
          const value = row[col.key]
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        }),
      )
    : data

  const statusStyles: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    pending: "bg-yellow-500/20 text-yellow-400",
    overdue: "bg-red-500/20 text-red-400",
    paid: "bg-green-500/20 text-green-400",
    draft: "bg-slate-600/20 text-slate-400",
    inactive: "bg-slate-600/20 text-slate-400",
  }

  return (
    <Card className="border-slate-700 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-50">{title}</CardTitle>
            {description && <CardDescription className="text-slate-400">{description}</CardDescription>}
          </div>
          {onAdd && (
            <Button
              onClick={onAdd}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              + {addButtonLabel}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {searchable && (
          <div className="mb-6 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-slate-700 text-slate-50"
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-400">No records found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    {columns.map((col) => (
                      <th key={String(col.key)} className="text-left py-3 px-4 text-slate-400 font-medium">
                        {col.label}
                      </th>
                    ))}
                    {(onEdit || onDelete) && (
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors"
                    >
                      {columns.map((col) => {
                        const value = row[col.key]
                        const statusKey = String(value).toLowerCase()
                        const isStatus = statusStyles[statusKey]

                        return (
                          <td key={String(col.key)} className="py-3 px-4">
                            {col.render ? (
                              col.render(value, row)
                            ) : isStatus ? (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${isStatus}`}>{value}</span>
                            ) : (
                              <span className="text-slate-50">{String(value)}</span>
                            )}
                          </td>
                        )
                      })}
                      {(onEdit || onDelete) && (
                        <td className="py-3 px-4 flex gap-2">
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(row)}
                              className="text-blue-400 hover:bg-blue-500/10"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(row.id || "")}
                              className="text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400">
                  Showing {filteredData.length} of {pagination.total} records
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    Page {pagination.currentPage} of {Math.ceil(pagination.total / pagination.pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage * pagination.pageSize >= pagination.total}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

const STATUSES = ["ALL", "PENDING", "AWAITING_PAYMENT", "PAID", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "CANCELLED"]

export function OrderFilters({ initialQuery, initialStatus }: { initialQuery: string; initialStatus: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  function applyFilters(status: string) {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (status !== "ALL") params.set("status", status)
    params.set("page", "1")
    router.push(`/admin/orders?${params.toString()}`)
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order number, customer, or address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyFilters(initialStatus)
          }}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={initialStatus}
          onChange={(e) => applyFilters(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s.replace("_", " ")}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={() => applyFilters(initialStatus)}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>
    </div>
  )
}
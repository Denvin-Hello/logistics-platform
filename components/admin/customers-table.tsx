"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { UsersTable } from "@/components/admin/users-table"

interface User {
  id: string
  name: string
  email: string
  phone: string
  type: "customer" | "provider"
  status: "active" | "inactive" | "suspended"
  joinDate: string
  totalOrders?: number
  rating?: number
}

export function CustomersTable({
  users,
  title,
  description,
}: {
  users: User[]
  title: string
  description: string
}) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? users.filter((user) => {
        const q = query.trim().toLowerCase()
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.id.toLowerCase().includes(q)
        )
      })
    : users

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, email, or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      <UsersTable users={filtered} title={title} description={description} />
    </div>
  )
}
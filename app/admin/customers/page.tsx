import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { CustomersTable } from "@/components/admin/customers-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CardDescription } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminCustomersPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [customers, newThisMonth, totalOrders] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      include: { _count: { select: { orders: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthStart } } }),
    prisma.order.count(),
  ])

  const mapped = customers.map((c) => ({
    id: c.id.slice(0, 8).toUpperCase(),
    name: c.name || c.email || "Unknown",
    email: c.email || "—",
    phone: "—",
    type: "customer" as const,
    status: (c.status === "APPROVED" ? "active" : "inactive") as "active" | "inactive",
    joinDate: c.createdAt.toISOString().slice(0, 10),
    totalOrders: c._count.orders,
  }))

  const activeCount = customers.filter((c) => c.status === "APPROVED").length
  const avgOrders = customers.length > 0 ? totalOrders / customers.length : 0

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Customer Management</h1>
            <p className="text-muted-foreground">Manage and monitor customer accounts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customers.length}</div>
                <p className="text-xs text-muted-foreground">Registered customer accounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">
                  {customers.length > 0 ? `${Math.round((activeCount / customers.length) * 100)}% of total` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{newThisMonth}</div>
                <p className="text-xs text-muted-foreground">Joined since month start</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Orders/Customer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgOrders.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Across all customers</p>
              </CardContent>
            </Card>
          </div>

          <CustomersTable users={mapped} title="All Customers" description="Complete list of registered customers" />
        </div>
      </div>
    </div>
  )
}
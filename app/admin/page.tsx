import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { StatsCards } from "@/components/admin/stats-cards"
import { OrdersTable } from "@/components/admin/orders-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

function pctChange(current: number, previous: number) {
  if (previous === 0) return 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export default async function AdminDashboard() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [totalOrders, totalCustomers, totalProviders, revenueAgg, recentOrders, thisMonthOrders, lastMonthOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.order.aggregate({ _sum: { amount: true } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { assignedProvider: { select: { businessName: true, name: true } } },
      }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.count({
        where: { createdAt: { gte: lastMonthStart, lt: monthStart } },
      }),
    ])

  const revenue = revenueAgg._sum.amount ?? 0

  const lastMonthOrdersSum = await prisma.order.aggregate({
    where: { createdAt: { gte: lastMonthStart, lt: monthStart } },
    _sum: { amount: true },
  })

  const mockStats = {
    totalOrders,
    totalCustomers,
    totalProviders,
    totalRevenue: revenue,
    ordersChange: pctChange(thisMonthOrders, lastMonthOrders),
    customersChange: 0,
    providersChange: 0,
    revenueChange: pctChange(revenue, lastMonthOrdersSum._sum.amount ?? 0),
  }

  const mappedOrders = recentOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer: o.customerName,
    provider: o.assignedProvider?.businessName || o.assignedProvider?.name || "—",
    pickup: o.pickupAddress,
    delivery: o.deliveryAddress,
    status: o.status,
    amount: o.amount,
    date: o.createdAt.toISOString().slice(0, 10),
  }))

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Monitor and manage your logistics platform</p>
          </div>

          <div className="mb-8">
            <StatsCards stats={mockStats} />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>Current operational status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Gateway</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending applications</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">Review queue</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Service</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Operational</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Metrics</CardTitle>
                <CardDescription>Real-time platform numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-muted p-4">
                  <p className="text-sm font-semibold">Total revenue (all orders)</p>
                  <p className="text-2xl font-bold">R{revenue.toLocaleString()}</p>
                </div>
                <div className="rounded-3xl bg-muted p-4">
                  <p className="text-sm font-semibold">Orders this month</p>
                  <p className="text-2xl font-bold">{thisMonthOrders}</p>
                </div>
                <div className="rounded-3xl bg-muted p-4">
                  <p className="text-sm font-semibold">Registered users</p>
                  <p className="text-2xl font-bold">{(totalCustomers + totalProviders).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <OrdersTable orders={mappedOrders} />
        </div>
      </div>
    </div>
  )
}
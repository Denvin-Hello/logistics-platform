import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { OrdersGrid } from "@/components/provider/orders-grid"
import { AvailableOrders } from "@/components/provider/available-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, Clock, CheckCircle2 } from "lucide-react"
import { formatRands } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions)

  const orders = await prisma.order.findMany({
    where: { assignedProviderId: session?.user?.id },
    orderBy: { createdAt: "desc" },
  })

  const providerOrders = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    pickupAddress: o.pickupAddress,
    deliveryAddress: o.deliveryAddress,
    status: o.status,
    amount: o.amount,
    packageType: o.packageType,
    createdAt: o.createdAt.toISOString(),
  }))

  const availableOrders = await prisma.order.findMany({
    where: { status: "PAID", assignedProviderId: null },
    orderBy: { createdAt: "desc" },
  })

  const available = availableOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    pickupAddress: o.pickupAddress,
    deliveryAddress: o.deliveryAddress,
    amount: o.amount,
    packageType: o.packageType,
    createdAt: o.createdAt.toISOString(),
  }))

  const activeCount = orders.filter((o) => o.status !== "DELIVERED").length
  const earnings = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.amount, 0)
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {session?.user?.name || "Driver"}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCount > 0 ? `${activeCount} active route${activeCount === 1 ? "" : "s"}` : "No active deliveries"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatRands(earnings)}</div>
                <p className="text-xs text-muted-foreground">{deliveredCount} completed deliveries</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Deliveries Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveredCount}</div>
                <p className="text-xs text-muted-foreground">All-time completed orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Assigned</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">Orders assigned to you</p>
              </CardContent>
            </Card>
          </div>

          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Available Deliveries</h2>
                <p className="text-sm text-muted-foreground">
                  Customer orders waiting to be accepted. Accept one to claim it.
                </p>
              </div>
            </div>

            <AvailableOrders orders={available} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Deliveries</h2>
                <p className="text-sm text-muted-foreground">Manage your assigned deliveries with actions and details.</p>
              </div>
            </div>

            <OrdersGrid orders={providerOrders} />
          </section>
        </div>
      </div>
    </div>
  )
}
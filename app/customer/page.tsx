import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Package, Plus, MapPin, DollarSign, TrendingUp } from "lucide-react"
import { formatRands } from "@/lib/format"

export const dynamic = "force-dynamic"

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
    case "AWAITING_PAYMENT":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "PAID":
    case "ASSIGNED":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case "IN_TRANSIT":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "DELIVERED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }
}

const statusLabel = (status: string) => status.replace("_", " ").toLowerCase()

export default async function CustomerDashboard() {
  const session = await getServerSession(authOptions)

  const orders = await prisma.order.findMany({
    where: { customerId: session?.user?.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const totalOrders = await prisma.order.count({ where: { customerId: session?.user?.id } })
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length
  const activeCount = orders.filter((o) => o.status !== "DELIVERED").length
  const totalSpent = await prisma.order.aggregate({
    where: { customerId: session?.user?.id },
    _sum: { amount: true },
  })

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {session?.user?.name || "there"}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button asChild size="sm">
                <Link href="/customer/new-order">
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">Orders not yet delivered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatRands(totalSpent._sum.amount ?? 0)}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">{deliveredCount} delivered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Track Shipments</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.filter((o) => o.status !== "DELIVERED").length}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-accent/10 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-accent" />
                  Create New Order
                </CardTitle>
                <CardDescription>Send a package anywhere in South Africa</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/customer/new-order">New Delivery</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Track Packages
                </CardTitle>
                <CardDescription>Monitor your active deliveries in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/customer/tracking">Track Orders</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  My Orders
                </CardTitle>
                <CardDescription>View order history and invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/customer/orders">View Orders</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Recent Orders</h2>
              <Button asChild variant="outline">
                <Link href="/customer/orders">View All Orders</Link>
              </Button>
            </div>

            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
                  <Button asChild>
                    <Link href="/customer/new-order">Create your first order</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h3 className="font-semibold">#{order.orderNumber}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.pickupAddress} → {order.deliveryAddress}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">{formatRands(order.amount)}</p>
                            <p className="text-sm text-muted-foreground">{statusLabel(order.status)}</p>
                          </div>
                          <Badge className={getStatusColor(order.status)}>{statusLabel(order.status)}</Badge>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/customer/orders/${order.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
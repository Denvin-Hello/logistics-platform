import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DOCUMENT_TYPE_META, getProviderCompliance } from "@/lib/compliance"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { OrdersGrid } from "@/components/provider/orders-grid"
import { AvailableOrders } from "@/components/provider/available-orders"
import { TargetedOffers } from "@/components/provider/targeted-offers"
import { AvailabilityToggle } from "@/components/provider/availability-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, DollarSign, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { formatDate, formatRands } from "@/lib/format"
import { ORDER_STATUS } from "@/lib/order-status"
import { isAutoAssignmentEnabled, isOpenPoolAfterEscalation } from "@/lib/assignment-policy"

export const dynamic = "force-dynamic"

export default async function ProviderDashboard() {
  const session = await getServerSession(authOptions)
  const compliance = session?.user?.id
    ? await getProviderCompliance(session.user.id, "ACCEPT_ORDER")
    : null

  const providerUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAvailable: true },
      })
    : null

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

  const now = new Date()
  const offers = session?.user?.id
    ? await prisma.orderOffer.findMany({
        where: {
          providerId: session.user.id,
          status: "PENDING",
          expiresAt: { gt: now },
          order: {
            assignedProviderId: null,
            status: { in: [ORDER_STATUS.PRICE_AGREED, "PENDING"] },
          },
        },
        include: { order: true },
        orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
      })
    : []

  const targetedOffers = offers.map((offer) => ({
    id: offer.id,
    orderId: offer.orderId,
    orderNumber: offer.order.orderNumber,
    customerName: offer.order.customerName,
    pickupAddress: offer.order.pickupAddress,
    deliveryAddress: offer.order.deliveryAddress,
    amount: offer.order.amount,
    packageType: offer.order.packageType,
    createdAt: offer.order.createdAt.toISOString(),
    expiresAt: offer.expiresAt.toISOString(),
    distanceKm: offer.distanceM == null ? null : offer.distanceM / 1000,
  }))

  const autoEnabled = isAutoAssignmentEnabled()
  const openPoolOnly = autoEnabled && isOpenPoolAfterEscalation()
  const openPoolDisabled = autoEnabled && !isOpenPoolAfterEscalation()
  const availableOrders = await prisma.order.findMany({
    where: {
      status: { in: [ORDER_STATUS.PRICE_AGREED, "PENDING"] },
      assignedProviderId: null,
      ...(openPoolDisabled
        ? { id: "__open_pool_disabled__" }
        : openPoolOnly
          ? { OR: [{ assignmentUrgent: true }, { assignmentEscalatedAt: { not: null } }] }
          : {}),
      ...(session?.user?.id
        ? {
            declines: { none: { providerId: session.user.id } },
            offers: { none: { providerId: session.user.id, status: "PENDING", expiresAt: { gt: now } } },
          }
        : {}),
    },
    orderBy: [{ assignmentUrgent: "desc" }, { createdAt: "desc" }],
  })

  const available = availableOrders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    pickupAddress: o.pickupAddress,
    deliveryAddress: o.deliveryAddress,
    amount: o.amount,
    baseAmount: o.baseAmount,
    packageType: o.packageType,
    createdAt: o.createdAt.toISOString(),
    urgent: o.assignmentUrgent,
  }))

  const activeCount = orders.filter((o) => o.status !== ORDER_STATUS.PAID && o.status !== "DELIVERED").length
  const earnings = orders
    .filter((o) => o.status === ORDER_STATUS.PAID || o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.amount, 0)
  const deliveredCount = orders.filter((o) => o.status === ORDER_STATUS.PAID || o.status === "DELIVERED").length

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {session?.user?.name || "Driver"}</p>
            </div>
            <AvailabilityToggle initialValue={providerUser?.isAvailable ?? false} />
          </div>

          {compliance && !compliance.ok ? (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Compliance documents needed</p>
                <p>
                  You cannot accept new deliveries until these are verified:{" "}
                  {compliance.missing.map((type) => DOCUMENT_TYPE_META[type].label).join(", ")}.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/provider/compliance">Update compliance</Link>
                </Button>
              </div>
            </div>
          ) : compliance?.inGrace ? (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Compliance documents due</p>
                <p>
                  Upload your documents by{" "}
                  {compliance.graceUntil ? formatDate(compliance.graceUntil) : "the end of the grace period"} to
                  keep accepting deliveries.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href="/provider/compliance">Upload documents</Link>
                </Button>
              </div>
            </div>
          ) : null}

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

          <TargetedOffers offers={targetedOffers} />

          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Available Deliveries</h2>
                <p className="text-sm text-muted-foreground">
                  {openPoolDisabled
                    ? "The open pool is disabled. Targeted offers will appear above."
                    : openPoolOnly
                      ? "Escalated deliveries that are open to all eligible providers."
                      : "Customer orders waiting to be accepted. Accept one to claim it."}
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
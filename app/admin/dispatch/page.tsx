import { prisma } from "@/lib/prisma"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { DispatchBoard, type DispatchOrder } from "@/components/admin/dispatch-board"
import { Badge } from "@/components/ui/badge"
import { isAutoAssignmentEnabled } from "@/lib/assignment-policy"

export const dynamic = "force-dynamic"

const OPEN_STATUSES = ["PRICE_AGREED", "PENDING"] as const

export default async function AdminDispatchPage() {
  const now = new Date()
  const [orders, providers] = await Promise.all([
    prisma.order.findMany({
      where: { assignedProviderId: null, status: { in: [...OPEN_STATUSES] } },
      orderBy: [{ assignmentUrgent: "desc" }, { createdAt: "asc" }],
      include: { offers: { where: { status: "PENDING" }, select: { id: true } } },
    }),
    prisma.user.findMany({
      where: { role: "PROVIDER", status: "APPROVED" },
      orderBy: [{ isAvailable: "desc" }, { businessName: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        businessName: true,
        vehicleType: true,
        serviceArea: true,
        isAvailable: true,
      },
    }),
  ])

  const queue: DispatchOrder[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    amount: order.amount,
    packageType: order.packageType,
    createdAt: order.createdAt.toISOString(),
    attempts: order.assignmentAttempts,
    ageMinutes: Math.max(0, Math.floor((now.getTime() - order.createdAt.getTime()) / 60_000)),
    pendingOffers: order.offers.length,
    urgent: order.assignmentUrgent,
    escalated: Boolean(order.assignmentEscalatedAt),
  }))

  const urgentCount = queue.filter((order) => order.urgent).length
  const offeredCount = queue.filter((order) => order.pendingOffers > 0).length
  const autoEnabled = isAutoAssignmentEnabled()

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">Dispatch</h1>
            {urgentCount > 0 ? <Badge variant="destructive">{urgentCount} urgent</Badge> : null}
          </div>
          <p className="text-muted-foreground">
            {queue.length} unassigned deliver{queue.length === 1 ? "y" : "ies"} · {offeredCount} with active
            offers
          </p>
        </div>

        {!autoEnabled ? (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            Automatic offers are off. New orders will stay in this queue until you use{" "}
            <span className="font-medium">Retry offers</span>. Set{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900">AUTO_ASSIGNMENT_ENABLED=true</code>{" "}
            to enable automatic matching.
          </div>
        ) : null}

        <DispatchBoard orders={queue} providers={providers} />
      </div>
    </div>
  )
}

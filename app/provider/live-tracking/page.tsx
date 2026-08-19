import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { LiveTrackingPanel } from "@/components/provider/live-tracking-panel"

export const dynamic = "force-dynamic"

export default async function ProviderLiveTrackingPage() {
  const session = await getServerSession(authOptions)

  const orders = await prisma.order.findMany({
    where: { assignedProviderId: session?.user?.id, status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
    orderBy: { createdAt: "asc" },
    include: { assignedProvider: { select: { businessName: true, name: true } } },
  })

  const mapped = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    deliveryAddress: o.deliveryAddress,
    pickupAddress: o.pickupAddress,
    status: o.status,
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />

      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Live Tracking</h1>
          <p className="text-muted-foreground">
            Share your GPS location so customers can follow their delivery in real time.
          </p>
        </div>

        <LiveTrackingPanel orders={mapped} />
      </div>
    </div>
  )
}
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { OrdersGrid } from "@/components/provider/orders-grid"

export const dynamic = "force-dynamic"

export default async function ProviderDeliveriesPage() {
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

  const activeOrders = providerOrders.filter((o) => o.status !== "DELIVERED")

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Active Deliveries</h1>
          <p className="text-muted-foreground">Manage deliveries and move orders through the workflow.</p>
        </div>

        <OrdersGrid orders={activeOrders} />
      </div>
    </div>
  )
}
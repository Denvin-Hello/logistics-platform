import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { geocodeAddress } from "@/lib/geocode"
import { getRoute } from "@/lib/routing"
import { ARRIVAL_RADIUS_M, MAX_GPS_ACCURACY_M } from "@/lib/trip-config"
import { ORDER_STATUS } from "@/lib/order-status"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { TripBoard } from "@/components/provider/trip-board"
import type { GeoPoint } from "@/lib/geo"

export const dynamic = "force-dynamic"

type Props = { params: { id: string } }

export default async function ProviderTripPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    redirect("/auth?callbackUrl=/provider/deliveries")
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, assignedProviderId: session.user.id },
  })

  if (!order) redirect("/provider/deliveries")
  if (order.status !== ORDER_STATUS.ASSIGNED && order.status !== ORDER_STATUS.IN_TRANSIT) {
    redirect("/provider/deliveries")
  }

  async function resolvePoint(address: string, lat: number | null, lng: number | null): Promise<GeoPoint | null> {
    if (lat != null && lng != null) return { lat, lng }
    return geocodeAddress(address)
  }

  const [pickup, delivery] = await Promise.all([
    resolvePoint(order.pickupAddress, order.pickupLat, order.pickupLng),
    resolvePoint(order.deliveryAddress, order.deliveryLat, order.deliveryLng),
  ])

  // Persist resolved coordinates so the customer map and later visits agree.
  if (pickup && (order.pickupLat == null || order.pickupLng == null)) {
    await prisma.order.update({
      where: { id: order.id },
      data: { pickupLat: pickup.lat, pickupLng: pickup.lng },
    }).catch(() => undefined)
  }
  if (delivery && (order.deliveryLat == null || order.deliveryLng == null)) {
    await prisma.order.update({
      where: { id: order.id },
      data: { deliveryLat: delivery.lat, deliveryLng: delivery.lng },
    }).catch(() => undefined)
  }

  const route = pickup && delivery ? await getRoute(pickup, delivery) : null

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <TripBoard
          order={{
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            pickupAddress: order.pickupAddress,
            pickupPhone: order.pickupPhone,
            pickupDate: order.pickupDate,
            pickupTime: order.pickupTime,
            deliveryAddress: order.deliveryAddress,
            deliveryName: order.deliveryName,
            deliveryPhone: order.deliveryPhone,
            deliveryInstructions: order.deliveryInstructions,
            packageType: order.packageType,
            amount: order.amount,
            status: order.status,
            startedAt: order.startedAt?.toISOString() ?? null,
          }}
          pickup={pickup}
          delivery={delivery}
          route={route}
          radiusM={ARRIVAL_RADIUS_M}
          maxAccuracyM={MAX_GPS_ACCURACY_M}
        />
      </div>
    </div>
  )
}

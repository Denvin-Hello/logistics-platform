import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/security"
import { orderStatusLabel, ORDER_STATUS } from "@/lib/order-status"
import { getRoute } from "@/lib/routing"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

const step = (id: number, status: string, description: string, location: string, timestamp: string, completed: boolean) => ({
  id: String(id),
  status,
  description,
  location,
  timestamp,
  completed,
})

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  const rate = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  // A tracking number alone is not enough — require the email on the order so
  // an order number can't be used to enumerate customers and addresses.
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: "Enter the email used for this delivery." }, { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { assignedProvider: { select: { businessName: true, name: true, phone: true, vehicleType: true } } },
  })

  if (!order || (order.customerEmail || "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "No delivery found for that order number and email." }, { status: 404 })
  }

  const providerName = order.assignedProvider?.businessName || order.assignedProvider?.name || "a delivery provider"
  const route =
    order.pickupLat != null && order.pickupLng != null && order.deliveryLat != null && order.deliveryLng != null
      ? await getRoute(
          { lat: order.pickupLat, lng: order.pickupLng },
          { lat: order.deliveryLat, lng: order.deliveryLng },
        )
      : null
  const routeEstimate = route ? `About ${Math.max(1, Math.round(route.durationS / 60))} min by road` : null
  const events = []
  let n = 0

  events.push(
    step(++n, "Order Placed", "Your delivery request has been confirmed", order.pickupAddress, formatDateTime(order.createdAt), true),
  )

  if (order.acceptedAt) {
    events.push(
      step(++n, "Provider Assigned", `${providerName} accepted this delivery`, order.pickupAddress, formatDateTime(order.acceptedAt), true),
    )
  }

  if (order.startedAt) {
    events.push(
      step(
        ++n,
        "Picked Up",
        "Package has been collected and the trip has started",
        order.pickupAddress,
        formatDateTime(order.startedAt),
        true,
      ),
    )
  } else if (order.status === ORDER_STATUS.IN_TRANSIT || order.deliveredAt) {
    events.push(
      step(
        ++n,
        "Picked Up",
        "Package has been collected and the trip has started",
        order.pickupAddress,
        formatDateTime(order.acceptedAt ?? order.updatedAt),
        true,
      ),
    )
  }

  if (order.deliveredAt) {
    events.push(
      step(++n, "Delivered", `Package delivered to ${order.deliveryName}`, order.deliveryAddress, formatDateTime(order.deliveredAt), true),
    )
  }

  if (order.paidAt || order.paymentStatus === "PAID") {
    events.push(
      step(++n, "Payment Received", "Payment has been received for this delivery", order.deliveryAddress, formatDateTime(order.paidAt ?? order.updatedAt), true),
    )
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: orderStatusLabel(order.status),
    statusKey: order.status,
    estimatedDelivery:
      order.deliveredAt
        ? "Delivered"
        : order.status === ORDER_STATUS.IN_TRANSIT
          ? routeEstimate ?? "On the way — see live map"
          : "See timeline for latest update",
    startedAt: order.startedAt?.toISOString() ?? null,
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    coordinates: {
      pickup:
        order.pickupLat != null && order.pickupLng != null ? { lat: order.pickupLat, lng: order.pickupLng } : null,
      delivery:
        order.deliveryLat != null && order.deliveryLng != null
          ? { lat: order.deliveryLat, lng: order.deliveryLng }
          : null,
    },
    route,
    events,
    liveTracking:
      order.status === ORDER_STATUS.ASSIGNED || order.status === ORDER_STATUS.IN_TRANSIT
        ? {
            driverLocation:
              order.driverLat != null && order.driverLng != null
                ? {
                    lat: order.driverLat,
                    lng: order.driverLng,
                    updatedAt: order.driverLocationUpdatedAt?.toISOString() ?? null,
                  }
                : null,
            pickupAddress: order.pickupAddress,
            deliveryAddress: order.deliveryAddress,
            estimatedArrival: routeEstimate ?? "See timeline for latest update",
            driverInfo: {
              name: providerName,
              phone: order.assignedProvider?.phone || "—",
              vehicle: order.assignedProvider?.vehicleType || "—",
            },
          }
        : undefined,
  })
}

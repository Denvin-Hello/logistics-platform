import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/security"
import { orderStatusLabel, ORDER_STATUS } from "@/lib/order-status"
import { getRoute } from "@/lib/routing"
import { formatDateTime } from "@/lib/format"

export const dynamic = "force-dynamic"

const NO_STORE = { "Cache-Control": "no-store" }

const step = (id: number, status: string, description: string, location: string, timestamp: string, completed: boolean) => ({
  id: String(id),
  status,
  description,
  location,
  timestamp,
  completed,
})

function displayName(provider: { name: string | null; businessName: string | null } | null | undefined): string {
  const business = provider?.businessName?.trim()
  if (business) return business
  const parts = (provider?.name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "a delivery provider"
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0]
}

function maskPhone(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "")
  if (digits.length < 4) return "—"
  return `••• ••• ${digits.slice(-4)}`
}

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  const rate = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: NO_STORE })
  }

  // A tracking number alone is not enough — require the email on the order so
  // an order number can't be used to enumerate customers and addresses.
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json(
      { error: "Enter the email used for this delivery." },
      { status: 401, headers: NO_STORE },
    )
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { assignedProvider: { select: { businessName: true, name: true, phone: true, vehicleType: true } } },
  })

  if (!order || (order.customerEmail || "").trim().toLowerCase() !== email) {
    return NextResponse.json(
      { error: "No delivery found for that order number and email." },
      { status: 404, headers: NO_STORE },
    )
  }

  const providerName = displayName(order.assignedProvider)
  const canContactDriver = order.status === ORDER_STATUS.IN_TRANSIT
  const route =
    order.pickupLat != null && order.pickupLng != null && order.deliveryLat != null && order.deliveryLng != null
      ? await getRoute(
          { lat: order.pickupLat, lng: order.pickupLng },
          { lat: order.deliveryLat, lng: order.deliveryLng },
        )
      : null
  const routeEstimate = route ? `About ${Math.max(1, Math.round(route.durationS / 60))} min by road` : null

  const driverLocation =
    order.driverLat != null && order.driverLng != null
      ? { lat: order.driverLat, lng: order.driverLng }
      : null
  const driverRoute =
    order.status === ORDER_STATUS.IN_TRANSIT &&
    driverLocation &&
    order.deliveryLat != null &&
    order.deliveryLng != null
      ? await getRoute(driverLocation, { lat: order.deliveryLat, lng: order.deliveryLng })
      : null
  const driverEstimate = driverRoute
    ? `About ${Math.max(1, Math.round(driverRoute.durationS / 60))} min to destination`
    : null
  const driverAgeSeconds = order.driverLocationUpdatedAt
    ? Math.max(0, Math.round((Date.now() - order.driverLocationUpdatedAt.getTime()) / 1000))
    : null
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
          ? driverEstimate ?? routeEstimate ?? "On the way — see live map"
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
            driverLocation: driverLocation
              ? {
                  ...driverLocation,
                  updatedAt: order.driverLocationUpdatedAt?.toISOString() ?? null,
                }
              : null,
            driverLocationAgeSeconds: driverAgeSeconds,
            driverLocationStale: driverAgeSeconds != null && driverAgeSeconds > 120,
            pickupAddress: order.pickupAddress,
            deliveryAddress: order.deliveryAddress,
            estimatedArrival: driverEstimate ?? routeEstimate ?? "See timeline for latest update",
            pollAfterMs: order.status === ORDER_STATUS.IN_TRANSIT ? 5000 : 15000,
            driverInfo: {
              displayName: providerName,
              phone: canContactDriver ? order.assignedProvider?.phone || "—" : maskPhone(order.assignedProvider?.phone),
              canContact: canContactDriver,
              vehicle: order.assignedProvider?.vehicleType || "—",
            },
          }
        : undefined,
  }, { headers: NO_STORE })
}

import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/security"

export const dynamic = "force-dynamic"

const statusLabel = (status: string) => {
  switch (status) {
    case "PENDING":
    case "AWAITING_PAYMENT":
      return "Awaiting Payment"
    case "PAID":
      return "Payment Confirmed"
    case "ASSIGNED":
      return "Provider Assigned"
    case "IN_TRANSIT":
      return "In Transit"
    case "DELIVERED":
      return "Delivered"
    default:
      return status.replace("_", " ")
  }
}

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

  const order = await prisma.order.findUnique({
    where: { orderNumber: params.orderNumber },
    include: { assignedProvider: { select: { businessName: true, name: true } } },
  })

  if (!order) {
    return NextResponse.json({ error: "Tracking number not found." }, { status: 404 })
  }

  const events = []
  let n = 0

  events.push(
    step(++n, "Order Placed", "Your delivery order has been confirmed", order.pickupAddress, order.createdAt.toLocaleString(), true),
  )

  if (order.status !== "PENDING") {
    events.push(
      step(++n, "Payment Confirmed", "Payment has been received for this order", order.pickupAddress, order.createdAt.toLocaleString(), true),
    )
  }

  if (order.status === "ASSIGNED" || order.status === "IN_TRANSIT" || order.status === "DELIVERED") {
    const providerName = order.assignedProvider?.businessName || order.assignedProvider?.name || "a delivery provider"
    events.push(
      step(++n, "Provider Assigned", `${providerName} has been assigned to this delivery`, order.pickupAddress, order.createdAt.toLocaleString(), true),
    )
  }

  if (order.status === "IN_TRANSIT" || order.status === "DELIVERED") {
    events.push(
      step(++n, "Picked Up", "Package has been collected from the pickup location", order.pickupAddress, order.updatedAt.toLocaleString(), true),
      step(++n, "In Transit", "Package is on its way to the destination", `${order.pickupAddress} → ${order.deliveryAddress}`, order.updatedAt.toLocaleString(), true),
    )
  }

  if (order.status === "DELIVERED") {
    events.push(
      step(++n, "Delivered", "Package has been successfully delivered", order.deliveryAddress, order.updatedAt.toLocaleString(), true),
    )
  }

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: statusLabel(order.status),
    estimatedDelivery: order.status === "DELIVERED" ? "Delivered" : "See timeline for latest update",
    events,
    liveTracking: order.status === "IN_TRANSIT" ? {
      currentLocation: { lat: -33.9249, lng: 18.4241, address: order.deliveryAddress },
      destination: { lat: -33.9321, lng: 18.8602, address: order.deliveryAddress },
      estimatedArrival: "As soon as the provider updates the route",
      driverInfo: {
        name: order.assignedProvider?.businessName || order.assignedProvider?.name || "Assigned provider",
        phone: "—",
        vehicle: "—",
      },
    } : undefined,
  })
}
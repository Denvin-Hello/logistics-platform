import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { isOpenToProviders, ORDER_STATUS } from "@/lib/order-status"
import { haversineDistanceM } from "@/lib/geo"
import { ARRIVAL_RADIUS_M, MAX_GPS_ACCURACY_M } from "@/lib/trip-config"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["accept", "decline", "start", "deliver", "mark_paid"]),
  reason: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().min(0).max(100_000).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "PROVIDER" || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = actionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const { action, reason, lat, lng, accuracy } = parsed.data
    const providerId = session.user.id

    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    if (action === "accept") {
      if (order.assignedProviderId === providerId && order.status === ORDER_STATUS.ASSIGNED) {
        return NextResponse.json({ ok: true, status: order.status })
      }

      const claimed = await prisma.order.updateMany({
        where: {
          id: order.id,
          assignedProviderId: null,
          status: { in: [ORDER_STATUS.PRICE_AGREED, "PENDING"] },
        },
        data: { assignedProviderId: providerId, status: ORDER_STATUS.ASSIGNED, acceptedAt: new Date() },
      })

      if (claimed.count === 0) {
        return NextResponse.json(
          { error: "This delivery has already been accepted by another provider." },
          { status: 409 },
        )
      }
      return NextResponse.json({ ok: true, status: ORDER_STATUS.ASSIGNED })
    }

    if (action === "decline") {
      if (order.assignedProviderId && order.assignedProviderId !== providerId) {
        return NextResponse.json({ error: "This order is not available to you." }, { status: 403 })
      }
      if (!isOpenToProviders(order.status)) {
        return NextResponse.json({ error: "This order can no longer be declined." }, { status: 409 })
      }
      await prisma.orderDecline.upsert({
        where: { orderId_providerId: { orderId: order.id, providerId } },
        update: { reason: reason?.trim() || null },
        create: { orderId: order.id, providerId, reason: reason?.trim() || null },
      })
      return NextResponse.json({ ok: true, status: order.status })
    }

    if (order.assignedProviderId !== providerId) {
      return NextResponse.json({ error: "This order is not assigned to you." }, { status: 403 })
    }

    if (action === "start") {
      if (order.status !== ORDER_STATUS.ASSIGNED) {
        return NextResponse.json({ error: "This delivery cannot be started yet." }, { status: 409 })
      }
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.IN_TRANSIT,
          acceptedAt: order.acceptedAt ?? new Date(),
          startedAt: order.startedAt ?? new Date(),
        },
      })
      return NextResponse.json({ ok: true, status: updated.status })
    }

    if (action === "deliver") {
      if (order.status !== ORDER_STATUS.IN_TRANSIT) {
        return NextResponse.json({ error: "Start the trip before marking it delivered." }, { status: 409 })
      }

      if (order.deliveryLat == null || order.deliveryLng == null) {
        return NextResponse.json(
          {
            error: "The destination could not be located. Dispatch must complete this delivery.",
            code: "DESTINATION_UNLOCATED",
          },
          { status: 409 },
        )
      }

      if (lat == null || lng == null || accuracy == null) {
        return NextResponse.json(
          {
            error: "Turn on location sharing so your arrival can be verified.",
            code: "LOCATION_REQUIRED",
          },
          { status: 422 },
        )
      }

      if (accuracy > MAX_GPS_ACCURACY_M) {
        return NextResponse.json(
          {
            error: `GPS accuracy is too low (${Math.round(accuracy)} m). Move to an open area and try again.`,
            code: "GPS_ACCURACY_LOW",
            accuracyM: Math.round(accuracy),
            maxAccuracyM: MAX_GPS_ACCURACY_M,
          },
          { status: 422 },
        )
      }

      const distanceM = haversineDistanceM(
        { lat, lng },
        { lat: order.deliveryLat, lng: order.deliveryLng },
      )

      if (distanceM > ARRIVAL_RADIUS_M) {
        return NextResponse.json(
          {
            error: `You are ${Math.round(distanceM)} m from the destination. Get within ${ARRIVAL_RADIUS_M} m to end the trip.`,
            code: "TOO_FAR",
            distanceM: Math.round(distanceM),
            radiusM: ARRIVAL_RADIUS_M,
          },
          { status: 409 },
        )
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: ORDER_STATUS.AWAITING_PAYMENT,
          paymentStatus: "PENDING",
          deliveredAt: new Date(),
          arrivalDistanceM: Math.round(distanceM),
          arrivalAccuracyM: Math.round(accuracy),
          driverLat: lat,
          driverLng: lng,
          driverLocationUpdatedAt: new Date(),
        },
      })
      return NextResponse.json({
        ok: true,
        status: updated.status,
        distanceM: Math.round(distanceM),
        radiusM: ARRIVAL_RADIUS_M,
      })
    }

    // mark_paid: provider records cash/card collected on hand-over.
    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ ok: true, status: order.status })
    }
    if (order.status !== ORDER_STATUS.AWAITING_PAYMENT && order.status !== ORDER_STATUS.DELIVERED) {
      return NextResponse.json({ error: "This delivery is not awaiting payment." }, { status: 409 })
    }

    const now = new Date()
    await prisma.payment.create({
      data: {
        order: { connect: { id: order.id } },
        amount: order.amount,
        method: "cod",
        status: "PAID",
        reference: `COD_${order.orderNumber}_${now.getTime()}`,
        collectedByProviderId: providerId,
        paidAt: now,
      },
    })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: ORDER_STATUS.PAID, paidAt: now },
    })

    return NextResponse.json({ ok: true, status: updated.status })
  } catch (error) {
    console.error("Provider order update error:", error)
    return NextResponse.json({ error: "Unable to update the order." }, { status: 500 })
  }
}

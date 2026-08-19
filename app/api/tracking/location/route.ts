import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"

const locationSchema = z.object({
  orderId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export async function POST(req: NextRequest) {
  const rate = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = locationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } })

    if (!order || order.assignedProviderId !== session.user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    if (order.status !== "ASSIGNED" && order.status !== "IN_TRANSIT") {
      return NextResponse.json({ error: "This order is not active for tracking." }, { status: 400 })
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        driverLat: parsed.data.lat,
        driverLng: parsed.data.lng,
        driverLocationUpdatedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to update location." }, { status: 500 })
  }
}
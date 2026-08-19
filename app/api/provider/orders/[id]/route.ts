import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"

const actionSchema = z.object({
  action: z.enum(["accept", "deliver"]),
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

    const order = await prisma.order.findUnique({ where: { id: params.id } })

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    if (parsed.data.action === "accept") {
      if (order.assignedProviderId === session.user.id) {
        if (order.status !== "ASSIGNED" && order.status !== "PENDING") {
          return NextResponse.json({ error: "This delivery can no longer be accepted." }, { status: 409 })
        }
        const updated = await prisma.order.update({
          where: { id: order.id },
          data: { status: "IN_TRANSIT" },
        })
        return NextResponse.json({ ok: true, status: updated.status })
      }

      if (order.assignedProviderId === null && (order.status === "PENDING" || order.status === "PAID")) {
        const claimed = await prisma.order.updateMany({
          where: { id: order.id, assignedProviderId: null, status: { in: ["PENDING", "PAID"] } },
          data: { assignedProviderId: session.user.id, status: "IN_TRANSIT" },
        })
        if (claimed.count === 0) {
          return NextResponse.json(
            { error: "This delivery has already been accepted by another provider." },
            { status: 409 },
          )
        }
        return NextResponse.json({ ok: true, status: "IN_TRANSIT" })
      }

      return NextResponse.json({ error: "This order is not available to accept." }, { status: 403 })
    }

    if (order.assignedProviderId !== session.user.id) {
      return NextResponse.json({ error: "This order is not assigned to you." }, { status: 403 })
    }

    if (order.status !== "IN_TRANSIT") {
      return NextResponse.json({ error: "This delivery cannot be marked as delivered yet." }, { status: 409 })
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: "DELIVERED" },
    })

    return NextResponse.json({ ok: true, status: updated.status })
  } catch {
    return NextResponse.json({ error: "Unable to update the order." }, { status: 500 })
  }
}
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { ORDER_STATUS } from "@/lib/order-status"
import { z } from "zod"

const overrideSchema = z.object({
  reason: z.string().trim().min(5).max(500),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const rate = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = overrideSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a reason of at least 5 characters." }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: params.id } })
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    if (order.status !== ORDER_STATUS.ASSIGNED && order.status !== ORDER_STATUS.IN_TRANSIT) {
      return NextResponse.json(
        { error: "Only active deliveries can be completed by dispatch." },
        { status: 409 },
      )
    }

    const now = new Date()
    const alreadyPaid = order.paymentStatus === "PAID"
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: alreadyPaid ? ORDER_STATUS.PAID : ORDER_STATUS.AWAITING_PAYMENT,
        paymentStatus: alreadyPaid ? "PAID" : "PENDING",
        deliveredAt: order.deliveredAt ?? now,
        deliveryOverrideAt: now,
        deliveryOverrideById: session.user.id,
        deliveryOverrideReason: parsed.data.reason,
      },
    })

    return NextResponse.json({ ok: true, status: updated.status })
  } catch {
    return NextResponse.json({ error: "Unable to complete this delivery." }, { status: 500 })
  }
}

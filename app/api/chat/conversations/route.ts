import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"
import { notifyAdmins, notifyUser } from "@/lib/notifications"
import { ORDER_STATUS } from "@/lib/order-status"

const createConversationSchema = z.object({
  orderId: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const rate = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isAdmin = session.user.role === "ADMIN"

  const conversations = await prisma.conversation.findMany({
    where: isAdmin
      ? {}
      : {
          participants: { some: { userId: session.user.id } },
        },
    include: {
      order: { select: { id: true, orderNumber: true, status: true, customerId: true, assignedProviderId: true } },
      participants: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, body: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ conversations })
}

export async function POST(req: NextRequest) {
  const rate = rateLimit(req, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const { orderId } = parsed.data

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, customerId: true, assignedProviderId: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 })
    }

    const isCustomer = order.customerId === session.user.id
    const isProvider = order.assignedProviderId === session.user.id
    const isAdmin = session.user.role === "ADMIN"

    if (!isCustomer && !isProvider && !isAdmin) {
      return NextResponse.json({ error: "Not a participant of this order." }, { status: 403 })
    }

    let conversation = await prisma.conversation.findUnique({
      where: { orderId },
      include: { participants: { include: { user: { select: { id: true, role: true } } } } },
    })

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          orderId,
          participants: {
            create: [
              { userId: order.customerId },
              ...(order.assignedProviderId ? [{ userId: order.assignedProviderId }] : []),
              ...(isAdmin ? [{ userId: session.user.id }] : []),
            ].filter((p, idx, arr) => arr.findIndex((x) => x.userId === p.userId) === idx),
          },
        },
        include: { participants: { include: { user: { select: { id: true, role: true } } } } },
      })
    }

    return NextResponse.json({ conversation })
  } catch {
    return NextResponse.json({ error: "Unable to create conversation." }, { status: 500 })
  }
}

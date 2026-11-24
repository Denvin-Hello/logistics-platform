import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"
import { notifyUser, notifyAdmins } from "@/lib/notifications"
import { ORDER_STATUS } from "@/lib/order-status"

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
  attachmentUrl: z.string().url().optional().nullable(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  const rate = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { conversationId } = params
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get("cursor")
  const take = Math.min(Math.max(parseInt(searchParams.get("take") || "50", 10), 1), 100)

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      orderId: true,
      participants: { select: { userId: true } },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
  }

  const isParticipant = conversation.participants.some((p) => p.userId === session.user.id)
  const isAdmin = session.user.role === "ADMIN"

  if (!isParticipant && !isAdmin) {
    return NextResponse.json({ error: "Not a participant." }, { status: 403 })
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  const nextCursor = messages.length === take ? messages[messages.length - 1]?.id : null

  return NextResponse.json({ messages, nextCursor })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  const rate = rateLimit(req, { limit: 60, windowMs: 60_000 })
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
    const { conversationId } = params
    const body = await req.json()
    const parsed = sendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        order: { select: { id: true, orderNumber: true, status: true, customerId: true, assignedProviderId: true } },
        participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 })
    }

    const isParticipant = conversation.participants.some((p) => p.userId === session.user.id)
    const isAdmin = session.user.role === "ADMIN"

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Not a participant." }, { status: 403 })
    }

    const isEnded =
      conversation.order.status === ORDER_STATUS.DELIVERED ||
      conversation.order.status === ORDER_STATUS.CANCELLED

    if (isEnded) {
      return NextResponse.json({ error: "Chat is closed for this order." }, { status: 403 })
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        body: parsed.data.body,
        attachmentUrl: parsed.data.attachmentUrl || null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    const sender = conversation.participants.find((p) => p.userId === session.user.id)?.user

    const recipients = conversation.participants.filter(
      (p) => p.userId !== session.user.id,
    )

    await Promise.all(
      recipients.map((p) =>
        notifyUser({
          userId: p.userId,
          type: "NEW_MESSAGE",
          title: `New message from ${sender?.name || "Unknown"}`,
          body: parsed.data.body.length > 100 ? `${parsed.data.body.slice(0, 100)}...` : parsed.data.body,
          href: `/customer/orders/${conversation.orderId}`,
          email: p.user.role === "ADMIN"
            ? undefined
            : {
                to: p.user.email || undefined,
                subject: `New message in order #${conversation.order.orderNumber}`,
                text: `You have a new message from ${sender?.name || "Unknown"} regarding order #${conversation.order.orderNumber}.\n\n${parsed.data.body}`,
              },
        }),
      ),
    )

    return NextResponse.json({ message })
  } catch {
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 })
  }
}

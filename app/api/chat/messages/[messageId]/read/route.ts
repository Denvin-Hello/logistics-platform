import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/security"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { messageId: string } },
) {
  const rate = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { messageId } = params

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { select: { id: true, participants: { select: { userId: true } } } } },
    })

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 })
    }

    const isParticipant = message.conversation.participants.some(
      (p) => p.userId === session.user.id,
    )
    const isAdmin = session.user.role === "ADMIN"

    if (!isParticipant && !isAdmin) {
      return NextResponse.json({ error: "Not a participant." }, { status: 403 })
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to mark as read." }, { status: 500 })
  }
}

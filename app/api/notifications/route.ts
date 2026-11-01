import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import {
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  id: z.string().min(1).optional(),
})

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 120, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { notifications, unreadCount } = await listNotifications(session.user.id)

  return NextResponse.json(
    {
      unreadCount,
      notifications: notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
        readAt: notification.readAt?.toISOString() ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function PATCH(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let id: string | undefined
  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }
    id = parsed.data.id
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (id) {
    await markNotificationRead(session.user.id, id)
  } else {
    await markAllNotificationsRead(session.user.id)
  }

  const unreadCount = await getUnreadNotificationCount(session.user.id)
  return NextResponse.json({ ok: true, unreadCount })
}

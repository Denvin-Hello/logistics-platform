import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"

interface EmailContent {
  to?: string | null
  subject: string
  text: string
  html?: string
}

interface NotifyUserInput {
  userId: string
  type: string
  title: string
  body: string
  href?: string | null
  email?: EmailContent
}

export async function notifyUser(input: NotifyUserInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
    },
  })

  if (input.email?.to) {
    try {
      await sendEmail({
        to: input.email.to,
        subject: input.email.subject,
        text: input.email.text,
        html: input.email.html,
      })
    } catch (error) {
      console.error("[notifications] Email delivery failed:", error)
    }
  }

  return notification
}

export async function notifyAdmins(
  input: Omit<NotifyUserInput, "userId" | "email"> & { email?: Omit<EmailContent, "to"> },
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  })

  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        ...input,
        userId: admin.id,
        email: input.email ? { ...input.email, to: admin.email } : undefined,
      }),
    ),
  )

  return admins.length
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } })
}

export async function listNotifications(userId: string, limit = 20) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 50),
    }),
    getUnreadNotificationCount(userId),
  ])

  return { notifications, unreadCount }
}

export async function markNotificationRead(userId: string, id: string) {
  return prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  })
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}

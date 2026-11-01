import { type NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  DOCUMENT_TYPE_META,
  MS_PER_DAY,
  daysUntil,
  nextReminderThreshold,
} from "@/lib/compliance"
import { notifyUser } from "@/lib/notifications"
import { recordAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization")
  if (header === `Bearer ${secret}`) return true
  return request.headers.get("x-cron-secret") === secret
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    )
  }

  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowEnd = new Date(now.getTime() + 31 * MS_PER_DAY)

  const documents = await prisma.complianceDocument.findMany({
    where: {
      status: "VERIFIED",
      expiresAt: { lte: windowEnd },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      reminders: { select: { thresholdDays: true } },
    },
    take: 500,
    orderBy: { expiresAt: "asc" },
  })

  let sent = 0
  let expired = 0
  let skipped = 0

  for (const document of documents) {
    const days = daysUntil(document.expiresAt, now)
    const label =
      DOCUMENT_TYPE_META[document.type as keyof typeof DOCUMENT_TYPE_META]?.label ?? document.type
    const sentThresholds = document.reminders.map((reminder) => reminder.thresholdDays)
    const isExpired = days <= 0

    async function markExpired() {
      if (!isExpired || document.status !== "VERIFIED") return
      await prisma.complianceDocument.update({
        where: { id: document.id },
        data: { status: "EXPIRED" },
      })
      expired += 1
      await recordAudit({
        actorId: null,
        action: "COMPLIANCE_DOCUMENT_EXPIRED",
        entityType: "ComplianceDocument",
        entityId: document.id,
        metadata: { type: document.type, expiresAt: document.expiresAt.toISOString() },
      })
    }

    const replacement = await prisma.complianceDocument.findFirst({
      where: {
        userId: document.userId,
        type: document.type,
        status: "VERIFIED",
        expiresAt: { gt: document.expiresAt },
        ...(document.vehicleRegistration
          ? { vehicleRegistration: document.vehicleRegistration }
          : {}),
      },
      select: { id: true },
    })

    if (replacement) {
      await markExpired()
      skipped += 1
      continue
    }

    const threshold = nextReminderThreshold(days, sentThresholds)
    if (threshold === null) {
      await markExpired()
      skipped += 1
      continue
    }
    const body = isExpired
      ? `${label} has expired. Upload a renewed document to keep accepting deliveries.`
      : `${label} expires in ${days} day${days === 1 ? "" : "s"}. Upload a renewed document to avoid interruption.`

    try {
      await notifyUser({
        userId: document.userId,
        type: isExpired ? "COMPLIANCE_DOCUMENT_EXPIRED" : "COMPLIANCE_DOCUMENT_EXPIRING",
        title: isExpired ? `${label} expired` : `${label} expires soon`,
        body,
        href: "/provider/compliance",
        email: {
          to: document.user.email,
          subject: isExpired ? `${label} expired` : `${label} expires in ${days} day${days === 1 ? "" : "s"}`,
          text: [
            body,
            "",
            `Document: ${label}`,
            `Expires: ${document.expiresAt.toISOString().slice(0, 10)}`,
            "",
            `Update it at ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/provider/compliance`,
          ].join("\n"),
        },
      })

      await prisma.complianceReminder.create({
        data: {
          documentId: document.id,
          providerId: document.userId,
          thresholdDays: threshold,
          channel: "EMAIL",
        },
      })
      await markExpired()
      sent += 1
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skipped += 1
        continue
      }
      console.error("Compliance reminder failed:", error)
    }
  }

  return NextResponse.json({
    ok: true,
    checked: documents.length,
    sent,
    expired,
    skipped,
  })
}

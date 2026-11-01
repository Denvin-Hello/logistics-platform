import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { getProviderCompliance } from "@/lib/compliance"
import { notifyUser } from "@/lib/notifications"
import { recordAudit } from "@/lib/audit"
import { z } from "zod"

const reviewSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "decline"]),
  reason: z.string().max(500).optional(),
  overrideReason: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const rate = rateLimit(req, { limit: 60, windowMs: 60_000 })
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
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const { userId, action, reason, overrideReason } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Provider not found." }, { status: 404 })
    }

    const override = (overrideReason || "").trim()

    if (action === "approve") {
      const compliance = await getProviderCompliance(userId, "APPROVAL")

      if (!compliance.ok && !override) {
        return NextResponse.json(
          {
            error: "The provider still needs valid compliance documents before approval.",
            code: "COMPLIANCE_REQUIRED",
            missing: compliance.missing,
          },
          { status: 409 },
        )
      }

      if (!compliance.ok && override) {
        await recordAudit({
          actorId: session.user.id,
          action: "PROVIDER_APPROVED_COMPLIANCE_OVERRIDE",
          entityType: "User",
          entityId: userId,
          metadata: { missing: compliance.missing, overrideReason: override },
        })
      }

      await prisma.user.update({
        where: { id: userId },
        data: { status: "APPROVED", declinedReason: null },
      })
      await recordAudit({
        actorId: session.user.id,
        action: "PROVIDER_APPROVED",
        entityType: "User",
        entityId: userId,
      })
      try {
        await notifyUser({
          userId,
          type: "PROVIDER_APPLICATION_APPROVED",
          title: "Provider application approved",
          body: compliance.ok
            ? "Your provider account is approved. Keep your compliance documents current so you can keep accepting deliveries."
            : "Your provider account is approved. Upload your compliance documents before accepting deliveries.",
          href: "/provider/compliance",
          email: {
            to: user.email,
            subject: "Provider application approved",
            text: compliance.ok
              ? "Your provider account has been approved. Keep your compliance documents current so you can keep accepting deliveries."
              : "Your provider account has been approved. Complete your compliance documents before accepting deliveries.",
          },
        })
      } catch (error) {
        console.error("Provider approval notification failed:", error)
      }
    } else {
      const declineReason = (reason || "").trim() || null
      await prisma.user.update({
        where: { id: userId },
        data: { status: "DECLINED", declinedReason: declineReason },
      })
      await recordAudit({
        actorId: session.user.id,
        action: "PROVIDER_DECLINED",
        entityType: "User",
        entityId: userId,
        metadata: { reason: declineReason },
      })
      try {
        await notifyUser({
          userId,
          type: "PROVIDER_APPLICATION_DECLINED",
          title: "Provider application declined",
          body: declineReason
            ? `Your provider application was declined: ${declineReason}`
            : "Your provider application was declined.",
          email: {
            to: user.email,
            subject: "Provider application declined",
            text: declineReason
              ? `Your provider application was declined.\n\nReason: ${declineReason}`
              : "Your provider application was declined.",
          },
        })
      } catch (error) {
        console.error("Provider decline notification failed:", error)
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to update the application." }, { status: 500 })
  }
}
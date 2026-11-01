import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { recordAudit } from "@/lib/audit"
import {
  AssignmentError,
  autoOfferOrder,
  manualAssignOrder,
  retryAssignment,
} from "@/lib/assignment"
import { getAssignmentPolicy } from "@/lib/assignment-policy"
import { z } from "zod"

const schema = z.object({
  action: z.enum(["retry", "widen", "urgent", "manual"]),
  providerId: z.string().min(1).optional(),
  reason: z.string().max(500).optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const { action, providerId, reason } = parsed.data

  try {
    if (action === "manual") {
      if (!providerId) {
        return NextResponse.json({ error: "Select a provider." }, { status: 400 })
      }
      const order = await manualAssignOrder(params.id, providerId, session.user.id, reason)
      return NextResponse.json({ ok: true, status: order.status })
    }

    if (action === "urgent") {
      const policy = getAssignmentPolicy()
      await prisma.order.update({
        where: { id: params.id },
        data: { assignmentUrgent: true, assignmentEscalatedAt: new Date() },
      })
      const result = await autoOfferOrder(params.id, {
        force: true,
        clearPending: true,
        radiusOverrideKm: policy.radiusKm + policy.widenRadiusKm,
      })
      await recordAudit({
        actorId: session.user.id,
        action: "order.assignment.opened_to_pool",
        entityType: "Order",
        entityId: params.id,
        metadata: { created: result.created, eligible: result.eligible },
      })
      return NextResponse.json({ ok: true, ...result })
    }

    const result = await retryAssignment(params.id, {
      widen: action === "widen",
      actorId: session.user.id,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof AssignmentError) {
      return NextResponse.json(
        { error: error.message, code: error.code, ...(error.details as object | undefined) },
        { status: error.status },
      )
    }
    console.error("Dispatch action error:", error)
    return NextResponse.json({ error: "Unable to update dispatch." }, { status: 500 })
  }
}

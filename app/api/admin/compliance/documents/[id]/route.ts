import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { DOCUMENT_TYPE_META, daysUntil, effectiveDocumentStatus } from "@/lib/compliance"
import { notifyUser } from "@/lib/notifications"
import { recordAudit } from "@/lib/audit"

export const dynamic = "force-dynamic"

const reviewSchema = z.object({
  action: z.enum(["verify", "reject"]),
  notes: z.string().max(500).optional(),
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
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const notes = parsed.data.notes?.trim() || null
  if (parsed.data.action === "reject" && !notes) {
    return NextResponse.json({ error: "Add a reason so the provider can fix the document." }, { status: 400 })
  }

  const document = await prisma.complianceDocument.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 })
  }

  if (parsed.data.action === "verify" && daysUntil(document.expiresAt) <= 0) {
    return NextResponse.json(
      { error: "This document has already expired. Ask the provider to upload a current copy." },
      { status: 409 },
    )
  }

  const status = parsed.data.action === "verify" ? "VERIFIED" : "REJECTED"
  const updated = await prisma.complianceDocument.update({
    where: { id: document.id },
    data: {
      status,
      notes,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  })

  const label =
    DOCUMENT_TYPE_META[document.type as keyof typeof DOCUMENT_TYPE_META]?.label ?? document.type
  const approved = status === "VERIFIED"

  await recordAudit({
    actorId: session.user.id,
    action: approved ? "COMPLIANCE_DOCUMENT_VERIFIED" : "COMPLIANCE_DOCUMENT_REJECTED",
    entityType: "ComplianceDocument",
    entityId: document.id,
    metadata: { type: document.type, notes },
  })

  try {
    await notifyUser({
      userId: document.userId,
      type: approved ? "COMPLIANCE_DOCUMENT_VERIFIED" : "COMPLIANCE_DOCUMENT_REJECTED",
      title: approved ? "Compliance document verified" : "Compliance document needs attention",
      body: approved
        ? `${label} has been verified.`
        : `${label} was rejected${notes ? `: ${notes}` : "."}`,
      href: "/provider/compliance",
      email: {
        to: document.user.email,
        subject: approved ? `${label} verified` : `${label} needs attention`,
        text: approved
          ? `Your ${label} has been verified. You can view it in your provider compliance page.`
          : `Your ${label} was rejected.${notes ? `\n\nReason: ${notes}` : ""}\n\nUpload a corrected document in your provider compliance page.`,
      },
    })
  } catch (error) {
    console.error("Compliance review notification error:", error)
  }

  return NextResponse.json({
    ok: true,
    document: {
      ...updated,
      issuedAt: updated.issuedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt.toISOString(),
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      effectiveStatus: effectiveDocumentStatus(updated),
    },
  })
}

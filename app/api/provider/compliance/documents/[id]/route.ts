import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { deleteComplianceFile } from "@/lib/storage"
import { recordAudit } from "@/lib/audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const rate = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const document = await prisma.complianceDocument.findFirst({
    where: { id: params.id, userId: session.user.id },
  })

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 })
  }

  if (document.status === "VERIFIED") {
    return NextResponse.json(
      { error: "Verified documents cannot be deleted. Upload a replacement and wait for review." },
      { status: 409 },
    )
  }

  await prisma.complianceDocument.delete({ where: { id: document.id } })

  if (document.fileKey) {
    await deleteComplianceFile(document.fileKey)
  }

  await recordAudit({
    actorId: session.user.id,
    action: "COMPLIANCE_DOCUMENT_DELETED",
    entityType: "ComplianceDocument",
    entityId: document.id,
    metadata: { type: document.type, status: document.status },
  })

  return NextResponse.json({ ok: true })
}

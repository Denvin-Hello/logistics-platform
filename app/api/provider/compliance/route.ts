import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit } from "@/lib/security"
import {
  COMPLIANCE_DOCUMENT_TYPES,
  DOCUMENT_TYPE_META,
  daysUntil,
  effectiveDocumentStatus,
  getProviderCompliance,
} from "@/lib/compliance"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const compliance = await getProviderCompliance(session.user.id)

  return NextResponse.json(
    {
      ok: compliance.ok,
      inGrace: compliance.inGrace,
      graceUntil: compliance.graceUntil?.toISOString() ?? null,
      missing: compliance.missing,
      requirements: COMPLIANCE_DOCUMENT_TYPES.map((type) => ({
        type,
        ...DOCUMENT_TYPE_META[type],
        satisfied: !compliance.missing.includes(type),
      })),
      documents: compliance.documents.map((document) => ({
        ...document,
        issuedAt: document.issuedAt?.toISOString() ?? null,
        expiresAt: document.expiresAt.toISOString(),
        reviewedAt: document.reviewedAt?.toISOString() ?? null,
        createdAt: document.createdAt.toISOString(),
        effectiveStatus: effectiveDocumentStatus(document),
        daysRemaining: daysUntil(document.expiresAt),
        typeLabel: DOCUMENT_TYPE_META[document.type as keyof typeof DOCUMENT_TYPE_META]?.label ?? document.type,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

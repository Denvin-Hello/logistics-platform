import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit } from "@/lib/security"
import {
  daysUntil,
  effectiveDocumentStatus,
  getComplianceStats,
  listComplianceDocuments,
} from "@/lib/compliance"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const expiringParam = Number(params.get("expiring"))
  const [documents, stats] = await Promise.all([
    listComplianceDocuments({
      status: params.get("status") || undefined,
      type: params.get("type") || undefined,
      q: params.get("q") || undefined,
      expiringDays: Number.isFinite(expiringParam) && expiringParam > 0 ? expiringParam : undefined,
    }),
    getComplianceStats(),
  ])

  return NextResponse.json(
    {
      stats,
      documents: documents.map((document) => ({
        ...document,
        issuedAt: document.issuedAt?.toISOString() ?? null,
        expiresAt: document.expiresAt.toISOString(),
        reviewedAt: document.reviewedAt?.toISOString() ?? null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
        effectiveStatus: effectiveDocumentStatus(document),
        daysRemaining: daysUntil(document.expiresAt),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

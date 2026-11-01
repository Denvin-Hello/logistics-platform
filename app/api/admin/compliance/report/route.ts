import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit } from "@/lib/security"
import {
  DOCUMENT_TYPE_META,
  daysUntil,
  effectiveDocumentStatus,
  listComplianceDocuments,
} from "@/lib/compliance"

export const dynamic = "force-dynamic"

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const documents = await listComplianceDocuments({ limit: 500 })
  const header = [
    "Provider",
    "Email",
    "Business",
    "Document type",
    "Document number",
    "Vehicle registration",
    "Issued",
    "Expires",
    "Status",
    "Days remaining",
    "Reviewed by",
    "Reviewed at",
    "Uploaded at",
  ]

  const rows = documents.map((document) => {
    const typeLabel =
      DOCUMENT_TYPE_META[document.type as keyof typeof DOCUMENT_TYPE_META]?.label ?? document.type
    return [
      document.user.name,
      document.user.email,
      document.user.businessName,
      typeLabel,
      document.number,
      document.vehicleRegistration,
      document.issuedAt?.toISOString().slice(0, 10) ?? "",
      document.expiresAt.toISOString().slice(0, 10),
      effectiveDocumentStatus(document),
      daysUntil(document.expiresAt),
      document.reviewedBy?.name || document.reviewedBy?.email || "",
      document.reviewedAt?.toISOString() ?? "",
      document.createdAt.toISOString(),
    ]
  })

  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`
  const filename = `compliance-report-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

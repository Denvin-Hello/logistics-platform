import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  COMPLIANCE_DOCUMENT_TYPES,
  MS_PER_DAY,
  missingDocumentRequirements,
  type ComplianceDocumentType,
  type CompliancePurpose,
} from "./compliance-rules"

export * from "./compliance-rules"

export interface ProviderCompliance {
  ok: boolean
  inGrace: boolean
  graceUntil: Date | null
  missing: ComplianceDocumentType[]
  documents: Array<{
    id: string
    type: string
    number: string | null
    vehicleRegistration: string | null
    issuedAt: Date | null
    expiresAt: Date
    status: string
    notes: string | null
    fileKey: string | null
    fileName: string | null
    mimeType: string | null
    sizeBytes: number | null
    reviewedAt: Date | null
    createdAt: Date
  }>
}

export async function getProviderCompliance(
  providerId: string,
  purpose: CompliancePurpose = "ACCEPT_ORDER",
): Promise<ProviderCompliance> {
  const [user, documents] = await Promise.all([
    prisma.user.findUnique({ where: { id: providerId }, select: { complianceGraceUntil: true } }),
    prisma.complianceDocument.findMany({
      where: { userId: providerId },
      orderBy: [{ type: "asc" }, { expiresAt: "desc" }],
    }),
  ])

  const now = new Date()
  const graceUntil = user?.complianceGraceUntil ?? null
  const inGrace = Boolean(graceUntil && graceUntil.getTime() > now.getTime())
  const missing = missingDocumentRequirements(documents, purpose, now)

  return {
    ok: missing.length === 0 || inGrace,
    inGrace,
    graceUntil,
    missing,
    documents,
  }
}

export interface ProviderComplianceSummary {
  ok: boolean
  inGrace: boolean
  graceUntil: Date | null
  missing: ComplianceDocumentType[]
}

export async function getProviderComplianceBatch(
  providerIds: string[],
  purpose: CompliancePurpose = "ACCEPT_ORDER",
  now = new Date(),
): Promise<Map<string, ProviderComplianceSummary>> {
  const uniqueIds = Array.from(new Set(providerIds.filter(Boolean)))
  const result = new Map<string, ProviderComplianceSummary>()
  if (uniqueIds.length === 0) return result

  const [users, documents] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, complianceGraceUntil: true },
    }),
    prisma.complianceDocument.findMany({
      where: { userId: { in: uniqueIds } },
      orderBy: [{ type: "asc" }, { expiresAt: "desc" }],
    }),
  ])

  const docsByUser = new Map<string, typeof documents>()
  for (const document of documents) {
    const list = docsByUser.get(document.userId)
    if (list) list.push(document)
    else docsByUser.set(document.userId, [document])
  }

  for (const user of users) {
    const graceUntil = user.complianceGraceUntil ?? null
    const inGrace = Boolean(graceUntil && graceUntil.getTime() > now.getTime())
    const missing = missingDocumentRequirements(docsByUser.get(user.id) ?? [], purpose, now)
    result.set(user.id, {
      ok: missing.length === 0 || inGrace,
      inGrace,
      graceUntil,
      missing,
    })
  }

  return result
}

export interface ComplianceListFilters {
  status?: string
  type?: string
  q?: string
  expiringDays?: number
  limit?: number
}

export async function listComplianceDocuments(filters: ComplianceListFilters = {}) {
  const now = new Date()
  const conditions: Prisma.ComplianceDocumentWhereInput[] = []

  if (filters.type && COMPLIANCE_DOCUMENT_TYPES.includes(filters.type as ComplianceDocumentType)) {
    conditions.push({ type: filters.type })
  }

  if (filters.status === "PENDING" || filters.status === "REJECTED") {
    conditions.push({ status: filters.status })
  } else if (filters.status === "VERIFIED") {
    conditions.push({ status: "VERIFIED", expiresAt: { gt: now } })
  } else if (filters.status === "EXPIRED") {
    conditions.push({
      OR: [{ status: "EXPIRED" }, { status: "VERIFIED", expiresAt: { lte: now } }],
    })
  }

  if (filters.expiringDays && filters.expiringDays > 0) {
    const until = new Date(now.getTime() + filters.expiringDays * MS_PER_DAY)
    conditions.push({ status: "VERIFIED", expiresAt: { gt: now, lte: until } })
  }

  const query = filters.q?.trim()
  if (query) {
    conditions.push({
      OR: [
        { number: { contains: query, mode: "insensitive" } },
        { vehicleRegistration: { contains: query, mode: "insensitive" } },
        { user: { name: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
        { user: { businessName: { contains: query, mode: "insensitive" } } },
      ],
    })
  }

  return prisma.complianceDocument.findMany({
    where: conditions.length ? { AND: conditions } : undefined,
    include: {
      user: {
        select: { id: true, name: true, email: true, businessName: true, status: true },
      },
      reviewedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(filters.limit ?? 200, 1), 500),
  })
}

export async function getComplianceStats() {
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * MS_PER_DAY)

  const [total, pending, verified, expired, expiring] = await Promise.all([
    prisma.complianceDocument.count(),
    prisma.complianceDocument.count({ where: { status: "PENDING" } }),
    prisma.complianceDocument.count({ where: { status: "VERIFIED", expiresAt: { gt: now } } }),
    prisma.complianceDocument.count({
      where: { OR: [{ status: "EXPIRED" }, { status: "VERIFIED", expiresAt: { lte: now } }] },
    }),
    prisma.complianceDocument.count({
      where: { status: "VERIFIED", expiresAt: { gt: now, lte: in30Days } },
    }),
  ])

  return { total, pending, verified, expired, expiring }
}

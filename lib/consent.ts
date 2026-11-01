import { prisma } from "@/lib/prisma"

export const CURRENT_LEGAL_VERSION = "2026-10-26"

export const CONSENT_TYPES = ["TERMS", "PRIVACY"] as const
export type ConsentType = (typeof CONSENT_TYPES)[number]

export async function recordSignupConsent(userId: string) {
  await prisma.consentRecord.createMany({
    data: CONSENT_TYPES.map((type) => ({
      userId,
      type,
      version: CURRENT_LEGAL_VERSION,
    })),
    skipDuplicates: true,
  })
}

export async function hasCurrentConsent(userId: string): Promise<boolean> {
  const records = await prisma.consentRecord.findMany({
    where: { userId, version: CURRENT_LEGAL_VERSION },
    select: { type: true },
  })
  const accepted = new Set(records.map((record) => record.type))
  return CONSENT_TYPES.every((type) => accepted.has(type))
}

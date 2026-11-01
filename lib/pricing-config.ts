import type { PricingConfig, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { parsePricingConfig, PricingError, type PricingConfigValues } from "@/lib/pricing"

export type PricingConfigRow = PricingConfig

export async function loadActivePricingConfig(): Promise<{
  row: PricingConfigRow
  config: PricingConfigValues
}> {
  const row = await prisma.pricingConfig.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  })

  if (!row) {
    throw new PricingError("PRICING_UNAVAILABLE", "No active pricing configuration is available.")
  }

  return { row, config: parsePricingConfig(row) }
}

export async function savePricingConfig(input: unknown, createdById: string | null) {
  const config = parsePricingConfig(input)

  return prisma.$transaction(async (tx) => {
    const latest = await tx.pricingConfig.findFirst({
      orderBy: { version: "desc" },
      select: { version: true },
    })

    await tx.pricingConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })

    return tx.pricingConfig.create({
      data: {
        version: (latest?.version ?? 0) + 1,
        isActive: true,
        currency: config.currency,
        baseFare: config.baseFare,
        minimumFare: config.minimumFare,
        distanceBands: config.distanceBands as Prisma.InputJsonValue,
        distanceRates: config.distanceRates as Prisma.InputJsonValue,
        freeWeightKg: config.freeWeightKg,
        weightBands: config.weightBands as Prisma.InputJsonValue,
        weightRates: config.weightRates as Prisma.InputJsonValue,
        volumetricDivisor: config.volumetricDivisor,
        quoteTtlMinutes: config.quoteTtlMinutes,
        createdById,
      },
    })
  })
}

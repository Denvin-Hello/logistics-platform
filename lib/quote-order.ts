import { randomUUID } from "node:crypto"
import type { Quote } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCategory } from "@/lib/freight"
import { ORDER_STATUS } from "@/lib/order-status"
import { PricingError, type NormalizedParcel } from "@/lib/pricing"

export const QUOTE_STATUS = {
  OPEN: "OPEN",
  CONSUMED: "CONSUMED",
  EXPIRED: "EXPIRED",
} as const

export const QUOTE_SOURCE = {
  FORM: "FORM",
  QUICK: "QUICK",
} as const

export function quoteParcels(quote: Pick<Quote, "parcels">): NormalizedParcel[] {
  return (quote.parcels as unknown as NormalizedParcel[]) || []
}

export function isQuoteExpired(quote: Pick<Quote, "expiresAt">) {
  return quote.expiresAt.getTime() <= Date.now()
}

export async function expireQuoteIfNeeded(quote: Quote) {
  if (quote.status === QUOTE_STATUS.OPEN && isQuoteExpired(quote)) {
    await prisma.quote.updateMany({
      where: { id: quote.id, status: QUOTE_STATUS.OPEN, expiresAt: { lte: new Date() } },
      data: { status: QUOTE_STATUS.EXPIRED },
    })
    return { ...quote, status: QUOTE_STATUS.EXPIRED }
  }
  return quote
}

function summaryDescription(parcels: NormalizedParcel[]) {
  const count = parcels.reduce((sum, parcel) => sum + parcel.quantity, 0)
  const types = Array.from(new Set(parcels.map((parcel) => getCategory(parcel.packageType).label)))
  return `${count} ${count === 1 ? "parcel" : "parcels"} · ${types.join(", ")}`
}

export async function createOrderFromQuote(input: {
  quote: Quote
  customerName: string
  customerEmail: string
  amount: number
}) {
  const { quote } = input
  const parcels = quoteParcels(quote)
  if (parcels.length === 0) {
    throw new PricingError("INVALID_QUOTE", "This quote has no parcels.")
  }

  const now = new Date()
  const orderNumber = `ORD${randomUUID().slice(0, 12).toUpperCase()}`
  const first = parcels[0]
  const weight = parcels.reduce((sum, parcel) => sum + parcel.actualWeightKg * parcel.quantity, 0)
  const length = Math.max(...parcels.map((parcel) => parcel.lengthCm))
  const width = Math.max(...parcels.map((parcel) => parcel.widthCm))
  const height = Math.max(...parcels.map((parcel) => parcel.heightCm))
  const fragile = parcels.some((parcel) => !!getCategory(parcel.packageType).flags?.fragile)

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.quote.updateMany({
      where: {
        id: quote.id,
        customerId: quote.customerId,
        status: QUOTE_STATUS.OPEN,
        expiresAt: { gt: now },
      },
      data: { status: QUOTE_STATUS.CONSUMED, consumedAt: now },
    })

    if (claimed.count === 0) {
      throw new PricingError("QUOTE_NOT_AVAILABLE", "This quote has expired or has already been used.")
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        customer: { connect: { id: quote.customerId } },
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        pickupAddress: quote.pickupAddress,
        pickupPhone: quote.pickupPhone,
        pickupDate: quote.pickupDate,
        pickupTime: quote.pickupTime,
        deliveryAddress: quote.deliveryAddress,
        deliveryName: quote.deliveryName,
        deliveryPhone: quote.deliveryPhone,
        deliveryInstructions: quote.deliveryInstructions,
        packageType: first.packageType,
        packageCategory: getCategory(first.packageType).group,
        weight,
        length,
        width,
        height,
        packageDescription: summaryDescription(parcels),
        fragile,
        insurance: false,
        signatureRequired: false,
        amount: input.amount,
        baseAmount: quote.total,
        source: quote.source,
        pickupLat: quote.pickupLat,
        pickupLng: quote.pickupLng,
        deliveryLat: quote.deliveryLat,
        deliveryLng: quote.deliveryLng,
        distanceM: quote.distanceM,
        distanceKm: quote.distanceKm,
        chargeableWeightKg: quote.chargeableWeightKg,
        pricingConfigVersion: quote.pricingConfigVersion,
        description:
          quote.source === QUOTE_SOURCE.QUICK
            ? "LogiConnect Delivery Request"
            : "LogiConnect Delivery Service",
        paymentMethod: "pay_on_delivery",
        paymentStatus: "PENDING",
        status: ORDER_STATUS.PRICE_AGREED,
        parcels: {
          create: parcels.map((parcel, index) => ({
            packageType: parcel.packageType,
            catalogCategory: parcel.catalogCategory ?? null,
            catalogSubcategory: parcel.catalogSubcategory ?? null,
            itemKey: parcel.itemKey ?? null,
            itemLabel: parcel.itemLabel ?? null,
            description: parcel.description || "",
            length: parcel.lengthCm,
            width: parcel.widthCm,
            height: parcel.heightCm,
            actualWeightKg: parcel.actualWeightKg,
            quantity: parcel.quantity,
            chargeableWeightKg: parcel.chargeableWeightKg,
            sortOrder: index,
          })),
        },
      },
    })

    await tx.quote.update({
      where: { id: quote.id },
      data: { orderId: order.id },
    })

    return order
  })
}

export function quoteSummary(quote: Quote) {
  return {
    id: quote.id,
    status: quote.status,
    source: quote.source,
    currency: quote.currency,
    distanceM: quote.distanceM,
    distanceKm: quote.distanceKm,
    chargeableWeightKg: quote.chargeableWeightKg,
    baseFare: quote.baseFare,
    distanceFare: quote.distanceFare,
    weightFare: quote.weightFare,
    subtotal: quote.subtotal,
    total: quote.total,
    minimumApplied: quote.total > quote.subtotal,
    expiresAt: quote.expiresAt.toISOString(),
    parcels: quoteParcels(quote),
    pickupAddress: quote.pickupAddress,
    deliveryAddress: quote.deliveryAddress,
  }
}

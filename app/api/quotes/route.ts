import { type NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { GOODS_CATEGORIES, getCategory } from "@/lib/freight"
import { geocodePair } from "@/lib/geocode"
import { getRoute } from "@/lib/routing"
import { estimatePackage } from "@/lib/package-presets"
import {
  catalogItemEstimate,
  getCatalogItem,
  isCatalogItemBlocked,
  type CatalogItem,
} from "@/lib/package-catalog"
import {
  calculateDeliveryPrice,
  PRICING_LIMITS,
  PricingError,
  type ParcelInput,
} from "@/lib/pricing"
import { loadActivePricingConfig } from "@/lib/pricing-config"
import { QUOTE_SOURCE, QUOTE_STATUS, quoteSummary } from "@/lib/quote-order"
import { z } from "zod"

const parcelSchema = z
  .object({
    packageType: z.string().trim().min(1).optional(),
    itemKey: z.string().trim().min(1).optional(),
    itemLabel: z.string().trim().max(150).optional(),
    catalogCategory: z.string().trim().max(100).optional(),
    catalogSubcategory: z.string().trim().max(100).optional(),
    description: z.string().max(500).optional().default(""),
    lengthCm: z.coerce.number().min(0.1).max(PRICING_LIMITS.maxDimensionCm),
    widthCm: z.coerce.number().min(0.1).max(PRICING_LIMITS.maxDimensionCm),
    heightCm: z.coerce.number().min(0.1).max(PRICING_LIMITS.maxDimensionCm),
    actualWeightKg: z.coerce.number().min(0.01).max(PRICING_LIMITS.maxActualWeightKg),
    quantity: z.coerce.number().int().min(1).max(PRICING_LIMITS.maxQuantityPerParcel),
  })
  .refine((value) => !!value.itemKey || !!value.packageType, {
    message: "Choose an item or package type.",
    path: ["itemKey"],
  })

const quickItemSchema = z.object({
  itemKey: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(PRICING_LIMITS.maxQuantityPerParcel).default(1),
  description: z.string().trim().max(500).optional().default(""),
})

const bodySchema = z
  .object({
    source: z.enum(["FORM", "QUICK"]).default("FORM"),
    pickupAddress: z.string().trim().min(3, "Pickup address is required.").max(500),
    pickupPhone: z.string().trim().min(1, "Pickup phone is required.").max(50),
    pickupDate: z.string().trim().max(50).optional().default(""),
    pickupTime: z.string().trim().max(50).optional().default(""),
    deliveryAddress: z.string().trim().min(3, "Delivery address is required.").max(500),
    deliveryName: z.string().trim().min(1, "Recipient name is required.").max(120),
    deliveryPhone: z.string().trim().min(1, "Recipient phone is required.").max(50),
    deliveryInstructions: z.string().trim().max(1000).optional().default(""),
    parcels: z.array(parcelSchema).min(1).max(PRICING_LIMITS.maxParcels).optional(),
    quick: z
      .object({
        packageType: z.string().trim().min(1).optional(),
        quantity: z.coerce.number().int().min(1).max(PRICING_LIMITS.maxQuantityPerParcel).default(1),
        items: z.array(quickItemSchema).min(1).max(PRICING_LIMITS.maxParcels).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.source === "FORM" && (!value.parcels || value.parcels.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["parcels"], message: "Add at least one parcel." })
    }
    if (value.source === "QUICK") {
      if (!value.quick) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quick"], message: "Choose an item." })
      } else if (!value.quick.packageType && (!value.quick.items || value.quick.items.length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quick"], message: "Choose at least one item." })
      }
    }
  })

function validateCategories(parcels: ParcelInput[]) {
  for (const parcel of parcels) {
    const match = GOODS_CATEGORIES.find((category) => category.value === parcel.packageType)
    if (!match) {
      throw new PricingError("INVALID_PACKAGE_TYPE", `Unknown package type: ${parcel.packageType}.`)
    }
    if (match.flags?.blocked) {
      throw new PricingError("BLOCKED_GOODS", `${match.label} cannot be quoted online. Contact support.`)
    }
  }
}

function resolveCatalogItem(itemKey: string): CatalogItem {
  const item = getCatalogItem(itemKey)
  if (!item) {
    throw new PricingError("INVALID_PACKAGE_TYPE", `Unknown catalog item: ${itemKey}.`)
  }
  if (isCatalogItemBlocked(item)) {
    throw new PricingError("BLOCKED_GOODS", `${item.label} cannot be quoted online. Contact support.`)
  }
  return item
}

function catalogParcel(
  item: CatalogItem,
  quantity: number,
  description = "",
  measurements?: { lengthCm: number; widthCm: number; heightCm: number; actualWeightKg: number },
): ParcelInput {
  const fallback = catalogItemEstimate(item, 1)
  const estimate = measurements ?? {
    lengthCm: fallback.length,
    widthCm: fallback.width,
    heightCm: fallback.height,
    actualWeightKg: fallback.weight,
  }
  return {
    packageType: item.packageType,
    itemKey: item.value,
    itemLabel: item.label,
    catalogCategory: item.category,
    catalogSubcategory: item.subcategory,
    description,
    lengthCm: estimate.lengthCm,
    widthCm: estimate.widthCm,
    heightCm: estimate.heightCm,
    actualWeightKg: estimate.actualWeightKg,
    quantity,
  }
}

function priceErrorStatus(code: string) {
  switch (code) {
    case "INVALID_PARCEL":
    case "INVALID_PACKAGE_TYPE":
    case "BLOCKED_GOODS":
    case "INVALID_DISTANCE":
      return 400
    case "PRICING_UNAVAILABLE":
      return 503
    default:
      return 500
  }
}

export async function POST(request: NextRequest) {
  const rate = rateLimit(request, { limit: 20, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "CUSTOMER" || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid quote request." },
        { status: 400 },
      )
    }

    const details = parsed.data
    let parcels: ParcelInput[]

    if (details.source === QUOTE_SOURCE.QUICK) {
      const quick = details.quick!
      if (quick.items?.length) {
        parcels = quick.items.map((entry) =>
          catalogParcel(resolveCatalogItem(entry.itemKey), entry.quantity, entry.description),
        )
      } else {
        const packageType = quick.packageType!
        const category = getCategory(packageType)
        const estimate = estimatePackage(packageType, 1)
        parcels = [
          {
            packageType,
            description: `${quick.quantity} × ${category.label}`,
            lengthCm: estimate.length,
            widthCm: estimate.width,
            heightCm: estimate.height,
            actualWeightKg: estimate.weight,
            quantity: quick.quantity,
          },
        ]
      }
    } else {
      parcels = (details.parcels || []).map((parcel) => {
        if (parcel.itemKey) {
          return catalogParcel(resolveCatalogItem(parcel.itemKey), parcel.quantity, parcel.description, {
            lengthCm: parcel.lengthCm,
            widthCm: parcel.widthCm,
            heightCm: parcel.heightCm,
            actualWeightKg: parcel.actualWeightKg,
          })
        }
        return {
          packageType: parcel.packageType!.trim().toLowerCase(),
          description: parcel.description,
          lengthCm: parcel.lengthCm,
          widthCm: parcel.widthCm,
          heightCm: parcel.heightCm,
          actualWeightKg: parcel.actualWeightKg,
          quantity: parcel.quantity,
        }
      })
    }

    validateCategories(parcels)

    const { row, config } = await loadActivePricingConfig()
    const coords = await geocodePair(details.pickupAddress, details.deliveryAddress)

    if (!coords.pickup) {
      return NextResponse.json(
        {
          error: "We couldn't locate the pickup address. Add a street, suburb and city.",
          code: "PICKUP_UNRESOLVED",
        },
        { status: 422 },
      )
    }
    if (!coords.delivery) {
      return NextResponse.json(
        {
          error: "We couldn't locate the delivery address. Add a street, suburb and city.",
          code: "DELIVERY_UNRESOLVED",
        },
        { status: 422 },
      )
    }

    const route = await getRoute(coords.pickup, coords.delivery)
    if (route.isFallback) {
      return NextResponse.json(
        {
          error: "Road distance is unavailable right now. Please try again in a moment.",
          code: "ROUTE_UNAVAILABLE",
        },
        { status: 502 },
      )
    }

    const price = calculateDeliveryPrice({
      distanceKm: route.distanceM / 1000,
      distanceM: route.distanceM,
      parcels,
      config,
    })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + config.quoteTtlMinutes * 60_000)
    const snapshot = {
      configId: row.id,
      version: row.version,
      ...config,
    }

    const quote = await prisma.quote.create({
      data: {
        customerId: session.user.id,
        status: QUOTE_STATUS.OPEN,
        source: details.source,
        pickupAddress: details.pickupAddress,
        pickupPhone: details.pickupPhone,
        pickupDate: details.pickupDate || null,
        pickupTime: details.pickupTime || null,
        deliveryAddress: details.deliveryAddress,
        deliveryName: details.deliveryName,
        deliveryPhone: details.deliveryPhone,
        deliveryInstructions: details.deliveryInstructions,
        pickupLat: coords.pickup.lat,
        pickupLng: coords.pickup.lng,
        deliveryLat: coords.delivery.lat,
        deliveryLng: coords.delivery.lng,
        distanceM: price.distanceM,
        distanceKm: Math.round(price.distanceKm * 100) / 100,
        parcels: price.parcels as unknown as Prisma.InputJsonValue,
        chargeableWeightKg: price.chargeableWeightKg,
        baseFare: price.baseFare,
        distanceFare: price.distanceFare,
        weightFare: price.weightFare,
        subtotal: price.subtotal,
        total: price.total,
        currency: config.currency,
        pricingConfigId: row.id,
        pricingConfigVersion: row.version,
        pricingSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      quote: quoteSummary(quote),
      breakdown: {
        distanceLines: price.distanceLines,
        weightLines: price.weightLines,
      },
    })
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: priceErrorStatus(error.code) })
    }
    console.error("Quote creation error:", error)
    return NextResponse.json({ error: "Unable to create a quote right now." }, { status: 500 })
  }
}

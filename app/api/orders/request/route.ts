import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { GOODS_CATEGORIES, getCategory, quoteFreight } from "@/lib/freight"
import { estimatePackage } from "@/lib/package-presets"
import { geocodePair } from "@/lib/geocode"
import { ORDER_STATUS } from "@/lib/order-status"
import { z } from "zod"

// A customer may offer more than the law-of-averages base, never less. Guard
// against fat-finger/abuse entries beyond a generous multiple.
const MAX_PRICE_MULTIPLIER = 5

const requestSchema = z.object({
  pickupAddress: z.string().min(1, "Pickup address is required").max(500),
  pickupPhone: z.string().min(1, "Pickup phone is required").max(50),
  deliveryAddress: z.string().min(1, "Delivery address is required").max(500),
  deliveryName: z.string().min(1, "Recipient name is required").max(120),
  deliveryPhone: z.string().min(1, "Recipient phone is required").max(50),
  deliveryInstructions: z.string().max(1000).default(""),
  pickupDate: z.string().max(50).optional(),
  pickupTime: z.string().max(50).optional(),
  packageType: z
    .string()
    .min(1, "Choose what you're sending")
    .refine((v) => GOODS_CATEGORIES.some((c) => c.value === v.trim().toLowerCase()), "Unknown package type"),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  packageDescription: z.string().max(2000).default(""),
  offeredAmount: z.coerce.number().min(0).max(1_000_000).optional(),
  insurance: z.coerce.boolean().default(false),
  signatureRequired: z.coerce.boolean().default(false),
})

export async function POST(request: NextRequest) {
  const rate = rateLimit(request, { limit: 20, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== "CUSTOMER" || session.user.status !== "APPROVED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 })
    }

    const details = parsed.data
    const category = getCategory(details.packageType)
    const estimate = estimatePackage(details.packageType, details.quantity)

    const quote = quoteFreight({
      packageType: details.packageType,
      weightKg: estimate.weight,
      lengthCm: estimate.length,
      widthCm: estimate.width,
      heightCm: estimate.height,
      fragile: !!category.flags?.fragile,
      insurance: details.insurance,
      signatureRequired: details.signatureRequired,
    })

    if (quote.blocked) {
      return NextResponse.json({ error: quote.blockReason }, { status: 400 })
    }

    const baseAmount = quote.amount
    const offered = details.offeredAmount == null ? baseAmount : Math.round(details.offeredAmount)

    if (offered < baseAmount) {
      return NextResponse.json(
        { error: `Your offer is below the minimum base price of R${baseAmount}.` },
        { status: 400 },
      )
    }
    if (offered > baseAmount * MAX_PRICE_MULTIPLIER) {
      return NextResponse.json(
        { error: `Your offer is unusually high. The maximum is R${baseAmount * MAX_PRICE_MULTIPLIER}.` },
        { status: 400 },
      )
    }

    const coords = await geocodePair(details.pickupAddress, details.deliveryAddress)
    const orderNumber = `ORD${randomUUID().slice(0, 12).toUpperCase()}`

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customer: { connect: { id: session.user.id } },
        customerName: session.user.name || "Customer",
        customerEmail: session.user.email || "",
        pickupAddress: details.pickupAddress,
        pickupPhone: details.pickupPhone,
        pickupDate: details.pickupDate,
        pickupTime: details.pickupTime,
        deliveryAddress: details.deliveryAddress,
        deliveryName: details.deliveryName,
        deliveryPhone: details.deliveryPhone,
        deliveryInstructions: details.deliveryInstructions,
        packageType: details.packageType,
        packageCategory: category.group,
        weight: estimate.weight,
        length: estimate.length,
        width: estimate.width,
        height: estimate.height,
        packageDescription: details.packageDescription || `${details.quantity} × ${category.label}`,
        fragile: !!category.flags?.fragile,
        insurance: details.insurance,
        signatureRequired: details.signatureRequired,
        amount: offered,
        baseAmount,
        source: "REQUEST",
        pickupLat: coords.pickup?.lat ?? null,
        pickupLng: coords.pickup?.lng ?? null,
        deliveryLat: coords.delivery?.lat ?? null,
        deliveryLng: coords.delivery?.lng ?? null,
        description: "LogiConnect Delivery Request",
        paymentMethod: "pay_on_delivery",
        paymentStatus: "PENDING",
        status: ORDER_STATUS.PRICE_AGREED,
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderNumber,
        id: order.id,
        amount: order.amount,
        baseAmount: order.baseAmount,
        description: order.description,
      },
    })
  } catch (error) {
    console.error("Request creation error:", error)
    return NextResponse.json({ error: "Failed to create your request" }, { status: 500 })
  }
}

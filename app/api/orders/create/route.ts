import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { GOODS_CATEGORIES, getCategory, quoteFreight } from "@/lib/freight"
import { z } from "zod"

const orderDetailsSchema = z.object({
  pickupAddress: z.string().min(1, "Pickup address is required"),
  pickupPhone: z.string().default(""),
  pickupDate: z.string().optional(),
  pickupTime: z.string().optional(),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  deliveryName: z.string().min(1, "Delivery name is required"),
  deliveryPhone: z.string().min(1, "Delivery phone is required"),
  deliveryInstructions: z.string().default(""),
  packageType: z
    .string()
    .min(1, "Package type is required")
    .refine((v) => GOODS_CATEGORIES.some((c) => c.value === v.trim().toLowerCase()), "Unknown package type"),
  weight: z.coerce.number().min(0).max(8000).default(0),
  length: z.coerce.number().min(0).max(2200).default(0),
  width: z.coerce.number().min(0).max(260).default(0),
  height: z.coerce.number().min(0).max(430).default(0),
  packageDescription: z.string().default(""),
  fragile: z.coerce.boolean().default(false),
  insurance: z.coerce.boolean().default(false),
  signatureRequired: z.coerce.boolean().default(false),
  paymentMethod: z.string().default("card"),
})

function calculateOrderAmount(details: z.infer<typeof orderDetailsSchema>) {
  const quote = quoteFreight({
    packageType: details.packageType,
    weightKg: details.weight,
    lengthCm: details.length,
    widthCm: details.width,
    heightCm: details.height,
    fragile: details.fragile,
    insurance: details.insurance,
    signatureRequired: details.signatureRequired,
  })
  return quote.amount
}

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
    const parsed = orderDetailsSchema.safeParse(body.orderDetails)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid order details" },
        { status: 400 },
      )
    }

    const details = parsed.data
    const quote = quoteFreight({
      packageType: details.packageType,
      weightKg: details.weight,
      lengthCm: details.length,
      widthCm: details.width,
      heightCm: details.height,
      fragile: details.fragile,
      insurance: details.insurance,
      signatureRequired: details.signatureRequired,
    })
    if (quote.blocked) {
      return NextResponse.json({ error: quote.blockReason }, { status: 400 })
    }
    // Vehicle max (Y) is the dependent variable: smallest capable class for
    // the goods vector X, with the category mean blended in (law of averages).
    const category = getCategory(details.packageType)
    const orderNumber = `ORD${randomUUID().slice(0, 12).toUpperCase()}`
    const amount = quote.amount

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
        weight: details.weight,
        length: details.length,
        width: details.width,
        height: details.height,
        packageDescription: details.packageDescription,
        fragile: details.fragile,
        insurance: details.insurance,
        signatureRequired: details.signatureRequired,
        amount,
        description: "LogiConnect Delivery Service",
        paymentMethod: details.paymentMethod,
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      order: {
        orderId: order.orderNumber,
        amount: order.amount,
        description: order.description,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
      },
      quote: {
        category: category.label,
        actualKg: quote.actualKg,
        volumetricKg: Math.round(quote.volumetricKg * 10) / 10,
        chargeableKg: Math.round(quote.chargeableKg * 10) / 10,
        blendedKg: Math.round(quote.blendedKg * 10) / 10,
        requiredKg: Math.round(quote.requiredKg * 10) / 10,
        vehicle: quote.vehicle.label,
        vehicleCode: quote.vehicle.code,
        breakdown: quote.breakdown,
      },
    })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
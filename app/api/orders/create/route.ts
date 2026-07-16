import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function calculateOrderAmount(orderDetails: any) {
  const baseFee = 120
  const weight = Number(orderDetails.weight) || 0
  const volumeSurcharge =
    (Number(orderDetails.length) || 0) + (Number(orderDetails.width) || 0) + (Number(orderDetails.height) || 0) > 120
      ? 20
      : 0
  const fragileFee = orderDetails.fragile ? 30 : 0
  const insuranceFee = orderDetails.insurance ? 25 : 0
  const signatureFee = orderDetails.signature ? 10 : 0
  const weightFee = Math.max(0, weight - 1) * 15

  return Math.max(100, baseFee + weightFee + volumeSurcharge + fragileFee + insuranceFee + signatureFee)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const details = body.orderDetails

    if (!details) {
      return NextResponse.json({ error: "Missing order details" }, { status: 400 })
    }

    const orderNumber = `ORD${Date.now()}`
    const amount = calculateOrderAmount(details)

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customer: { connect: { email: session.user.email } },
        customerName: details.customerName || session.user.name || "Customer",
        customerEmail: details.customerEmail || session.user.email,
        pickupAddress: details.pickupAddress,
        pickupPhone: details.pickupPhone,
        pickupDate: details.pickupDate,
        pickupTime: details.pickupTime,
        deliveryAddress: details.deliveryAddress,
        deliveryName: details.deliveryName,
        deliveryPhone: details.deliveryPhone,
        deliveryInstructions: details.deliveryInstructions || "",
        packageType: details.packageType,
        weight: Number(details.weight) || 0,
        length: details.length || "",
        width: details.width || "",
        height: details.height || "",
        packageDescription: details.packageDescription || "",
        fragile: Boolean(details.fragile),
        insurance: Boolean(details.insurance),
        signatureRequired: Boolean(details.signature),
        amount,
        description: "LogiConnect Delivery Service",
        paymentMethod: details.paymentMethod || "card",
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
    })
  } catch (error) {
    console.error("Order creation error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

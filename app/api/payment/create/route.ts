import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { buildPayFastCheckout, payfastIsConfigured } from "@/lib/payfast"

export async function POST(request: NextRequest) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60_000 })
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
    const { orderId, paymentMethod } = body

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderId },
      include: { payments: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.customerId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        paymentId: order.payments[0]?.reference || "",
        redirectUrl: `/payment/success?payment_id=${order.payments[0]?.reference || ""}&order_id=${order.orderNumber}`,
      })
    }

    const paymentId = `PF_${randomUUID()}`

    await prisma.payment.create({
      data: {
        order: { connect: { id: order.id } },
        amount: order.amount,
        method: paymentMethod || order.paymentMethod || "card",
        status: "PENDING",
        reference: paymentId,
      },
    })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
      },
    })

    const baseUrl = request.nextUrl.origin
    const orderNumber = order.orderNumber

    // When PayFast credentials are configured, send the customer to the hosted
    // checkout. Otherwise complete the simulated demo payment flow.
    if (payfastIsConfigured()) {
      const checkout = buildPayFastCheckout({
        mPaymentId: orderNumber,
        amount: order.amount,
        itemName: order.description || "LogiConnect Delivery Service",
        itemDescription: `${order.packageType} delivery from ${order.pickupAddress} to ${order.deliveryAddress}`,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        returnUrl: `${baseUrl}/payment/success?payment_id=${paymentId}&order_id=${orderNumber}`,
        cancelUrl: `${baseUrl}/payment/cancel?order_id=${orderNumber}`,
        notifyUrl: `${baseUrl}/api/payment/notify`,
      })

      return NextResponse.json({ success: true, paymentId, checkout })
    }

    await prisma.payment.update({
      where: { reference: paymentId },
      data: { status: "PAID" },
    })

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", status: "PAID" },
    })

    return NextResponse.json({
      success: true,
      paymentId,
      redirectUrl: `/payment/success?payment_id=${paymentId}&order_id=${orderNumber}`,
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 })
  }
}
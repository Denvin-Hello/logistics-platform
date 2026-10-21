import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { buildPayFastCheckout, paymentsMode } from "@/lib/payfast"
import { ORDER_STATUS } from "@/lib/order-status"

// Orders are paid at the end of the delivery, so online settlement is only
// offered once an order is awaiting payment after hand-over.
const PAYABLE_STATUSES = [ORDER_STATUS.AWAITING_PAYMENT, ORDER_STATUS.DELIVERED]

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

    // Accept both the flat shape ({ orderId }) and the legacy nested shape
    // ({ orderDetails: { orderId } }) used by the checkout component.
    const orderNumber: unknown = body?.orderId ?? body?.orderDetails?.orderId
    const paymentMethod: string = body?.paymentMethod || body?.orderDetails?.paymentMethod || "payfast"

    if (!orderNumber || typeof orderNumber !== "string") {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
    }

    const mode = paymentsMode()
    if (mode === "cod_only") {
      return NextResponse.json(
        { error: "Online payment isn't available yet. Please pay cash or card on delivery." },
        { status: 409 },
      )
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
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
        paymentId: order.payments.find((p) => p.status === "PAID")?.reference || "",
        redirectUrl: `/payment/success?order_id=${order.orderNumber}`,
      })
    }

    if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
      return NextResponse.json(
        { error: "This order can only be paid once it has been delivered." },
        { status: 409 },
      )
    }

    // Reuse an outstanding pending payment instead of creating duplicates on retry.
    let payment = order.payments.find((p) => p.status === "PENDING")
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          order: { connect: { id: order.id } },
          amount: order.amount,
          method: paymentMethod || "payfast",
          status: "PENDING",
          reference: `PF_${randomUUID()}`,
        },
      })
    }

    if (mode === "payfast") {
      const baseUrl = request.nextUrl.origin
      const checkout = buildPayFastCheckout({
        mPaymentId: order.orderNumber,
        amount: order.amount,
        itemName: order.description || "LogiConnect Delivery Service",
        itemDescription: `${order.packageType} delivery from ${order.pickupAddress} to ${order.deliveryAddress}`,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        returnUrl: `${baseUrl}/payment/success?payment_id=${payment.reference}&order_id=${order.orderNumber}`,
        cancelUrl: `${baseUrl}/payment/cancel?order_id=${order.orderNumber}`,
        notifyUrl: `${baseUrl}/api/payment/notify`,
      })

      return NextResponse.json({ success: true, paymentId: payment.reference, checkout })
    }

    // demo mode (never reachable in production): settle immediately.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", paidAt: new Date() },
    })

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PAID",
        status: ORDER_STATUS.PAID,
        paidAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.reference,
      redirectUrl: `/payment/success?payment_id=${payment.reference}&order_id=${order.orderNumber}`,
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { orderDetails, paymentMethod } = body

    if (!orderDetails?.orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderDetails.orderId },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (order.customerEmail !== session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const paymentId = `PF_${Date.now()}`

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

    return NextResponse.json({
      success: true,
      paymentId,
      redirectUrl: `/payment/success?payment_id=${paymentId}&order_id=${order.orderNumber}`,
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json({ error: "Payment creation failed" }, { status: 500 })
  }
}

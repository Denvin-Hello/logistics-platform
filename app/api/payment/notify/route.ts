import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPayFastSignature } from "@/lib/payfast"

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    if (!MERCHANT_ID || !MERCHANT_KEY) {
      console.error("PayFast not configured: set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY")
      return new NextResponse("Not configured", { status: 503 })
    }

    const params: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") params[key] = value
    }

    const receivedSignature = params.signature
    delete params.signature

    if (params.merchant_id !== MERCHANT_ID) {
      return new NextResponse("Invalid merchant", { status: 400 })
    }

    if (!verifyPayFastSignature(params, receivedSignature, PASSPHRASE)) {
      return new NextResponse("Invalid signature", { status: 400 })
    }

    const orderNumber = params.m_payment_id
    const paymentStatus = params.payment_status

    if (paymentStatus === "COMPLETE" && orderNumber) {
      await handleCompletedPayment(orderNumber, params)
    } else {
      console.log(`PayFast ITN for order ${orderNumber}: status=${paymentStatus}`)
    }

    // PayFast expects a plain-text "OK" response.
    return new NextResponse("OK")
  } catch (error) {
    console.error("PayFast notification error:", error)
    return new NextResponse("Internal server error", { status: 500 })
  }
}

async function handleCompletedPayment(orderNumber: string, params: Record<string, string>) {
  const order = await prisma.order.findUnique({ where: { orderNumber } })

  if (!order) {
    console.warn(`Order not found for payment notify: ${orderNumber}`)
    return
  }

  // Amount must match exactly (PayFast sends Rands with 2 decimals).
  const expectedAmount = order.amount.toFixed(2)
  const receivedAmount = params.amount_gross

  if (!receivedAmount || Number(receivedAmount).toFixed(2) !== expectedAmount) {
    console.warn(`Amount mismatch for order ${orderNumber}: expected ${expectedAmount}, got ${receivedAmount}`)
    return
  }

  const reference = params.pf_payment_id || `pf_${orderNumber}`

  // Idempotency: if this payment reference was already processed, do nothing.
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId: order.id, reference },
  })

  if (existingPayment && existingPayment.status === "PAID") {
    return
  }

  const provider = await getAvailableProvider()

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      status: provider ? "ASSIGNED" : "PAID",
      assignedProvider: provider ? { connect: { id: provider.id } } : undefined,
    },
  })

  if (existingPayment) {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { status: "PAID" },
    })
  } else {
    await prisma.payment.create({
      data: {
        order: { connect: { id: order.id } },
        amount: order.amount,
        method: "payfast",
        status: "PAID",
        reference,
      },
    })
  }
}

async function getAvailableProvider() {
  const provider = await prisma.user.findFirst({
    where: { role: "PROVIDER", status: "APPROVED" },
  })
  return provider || null
}
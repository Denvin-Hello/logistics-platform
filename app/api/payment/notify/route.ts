import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const paymentData = {
      m_payment_id: formData.get("m_payment_id"),
      pf_payment_id: formData.get("pf_payment_id"),
      payment_status: formData.get("payment_status"),
      item_name: formData.get("item_name"),
      item_description: formData.get("item_description"),
      amount_gross: formData.get("amount_gross"),
      amount_fee: formData.get("amount_fee"),
      amount_net: formData.get("amount_net"),
      custom_str1: formData.get("custom_str1"),
      custom_str2: formData.get("custom_str2"),
      custom_str3: formData.get("custom_str3"),
      custom_str4: formData.get("custom_str4"),
      custom_str5: formData.get("custom_str5"),
      custom_int1: formData.get("custom_int1"),
      custom_int2: formData.get("custom_int2"),
      custom_int3: formData.get("custom_int3"),
      custom_int4: formData.get("custom_int4"),
      custom_int5: formData.get("custom_int5"),
      name_first: formData.get("name_first"),
      name_last: formData.get("name_last"),
      email_address: formData.get("email_address"),
      merchant_id: formData.get("merchant_id"),
      signature: formData.get("signature"),
    }

    const isValidSignature = verifyPayFastSignature(paymentData, process.env.PAYFAST_MERCHANT_KEY || "46f0cd694581a")

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    if (paymentData.payment_status === "COMPLETE" && paymentData.m_payment_id) {
      const provider = await updateOrderPaymentStatus(
        paymentData.m_payment_id as string,
        "PAID",
        paymentData.pf_payment_id as string,
      )

      await sendPaymentConfirmationEmail(paymentData.email_address as string, paymentData.m_payment_id as string)
      await notifyDeliveryProvider(paymentData.m_payment_id as string, provider?.name || "provider")
    }

    return NextResponse.json({ status: "OK" })
  } catch (error) {
    console.error("PayFast notification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function verifyPayFastSignature(data: any, merchantKey: string): boolean {
  try {
    const receivedSignature = data.signature
    delete data.signature

    const paramString = Object.keys(data)
      .filter((key) => data[key] !== "" && data[key] !== null)
      .sort()
      .map((key) => `${key}=${encodeURIComponent(data[key])}`)
      .join("&")

    const stringToHash = paramString + `&passphrase=${merchantKey}`
    const calculatedSignature = crypto.createHash("md5").update(stringToHash).digest("hex")

    return calculatedSignature === receivedSignature
  } catch (error) {
    console.error("Signature verification error:", error)
    return false
  }
}

async function updateOrderPaymentStatus(orderNumber: string, status: string, paymentId: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
  })

  if (!order) {
    console.warn(`Order not found for payment notify: ${orderNumber}`)
    return null
  }

  const providerConnect = await getAvailableProvider(order.id)

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: status,
      status: providerConnect ? "ASSIGNED" : "PAID",
      assignedProvider: providerConnect ? { connect: providerConnect } : undefined,
    },
  })

  const existingPayment = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      reference: paymentId,
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
        reference: paymentId,
      },
    })
  }

  const provider = await prisma.user.findFirst({
    where: { role: "PROVIDER" },
  })

  return provider
}

async function getAvailableProvider(orderId: string) {
  const provider = await prisma.user.findFirst({
    where: { role: "PROVIDER" },
  })

  if (!provider) {
    return undefined
  }

  return { id: provider.id }
}

async function sendPaymentConfirmationEmail(email: string, orderId: string) {
  console.log(`Sending payment confirmation email to ${email} for order ${orderId}`)
}

async function notifyDeliveryProvider(orderId: string, providerName: string) {
  console.log(`Notifying delivery provider ${providerName} for order ${orderId}`)
}

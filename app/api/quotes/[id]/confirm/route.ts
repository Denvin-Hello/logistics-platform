import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { PricingError } from "@/lib/pricing"
import {
  createOrderFromQuote,
  expireQuoteIfNeeded,
  QUOTE_SOURCE,
  QUOTE_STATUS,
} from "@/lib/quote-order"
import { autoOfferOrder } from "@/lib/assignment"

const MAX_OFFER_MULTIPLIER = 5

function orderResponse(order: {
  id: string
  orderNumber: string
  amount: number
  baseAmount: number | null
  description: string
}) {
  return {
    id: order.id,
    orderId: order.orderNumber,
    amount: order.amount,
    baseAmount: order.baseAmount,
    description: order.description,
  }
}

async function existingOrderResponse(quoteId: string) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { order: true },
  })
  if (!quote?.order) return null
  return NextResponse.json({ success: true, order: orderResponse(quote.order), reused: true })
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

  const body = await request.json().catch(() => ({}))
  const offeredRaw = (body as { offeredAmount?: unknown })?.offeredAmount
  const offeredAmount =
    offeredRaw == null || offeredRaw === "" ? null : Number(offeredRaw)

  if (offeredAmount !== null && (!Number.isFinite(offeredAmount) || offeredAmount < 0)) {
    return NextResponse.json({ error: "Enter a valid offer amount." }, { status: 400 })
  }

  const found = await prisma.quote.findFirst({
    where: { id: params.id, customerId: session.user.id },
  })

  if (!found) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 })
  }

  if (found.status === QUOTE_STATUS.CONSUMED) {
    const response = await existingOrderResponse(found.id)
    return response ?? NextResponse.json({ error: "This quote has already been used." }, { status: 409 })
  }

  const quote = await expireQuoteIfNeeded(found)
  if (quote.status === QUOTE_STATUS.EXPIRED) {
    return NextResponse.json(
      { error: "This quote has expired. Request a new price.", code: "QUOTE_EXPIRED" },
      { status: 410 },
    )
  }
  if (quote.status !== QUOTE_STATUS.OPEN) {
    return NextResponse.json({ error: "This quote cannot be confirmed." }, { status: 409 })
  }

  let amount = quote.total

  if (quote.source === QUOTE_SOURCE.QUICK) {
    if (offeredAmount !== null) {
      amount = Math.round(offeredAmount)
      if (amount < quote.total) {
        return NextResponse.json(
          { error: `Your offer must be at least R${quote.total}.` },
          { status: 400 },
        )
      }
      if (amount > quote.total * MAX_OFFER_MULTIPLIER) {
        return NextResponse.json(
          { error: `Your offer cannot exceed R${quote.total * MAX_OFFER_MULTIPLIER}.` },
          { status: 400 },
        )
      }
    }
  } else if (offeredAmount !== null) {
    return NextResponse.json(
      { error: "This delivery is priced from the stored quote and cannot be changed." },
      { status: 400 },
    )
  }

  try {
    const order = await createOrderFromQuote({
      quote,
      customerName: session.user.name || "Customer",
      customerEmail: session.user.email || "",
      amount,
    })

    try {
      await autoOfferOrder(order.id)
    } catch (error) {
      console.error("Auto assignment error:", error)
    }

    return NextResponse.json({ success: true, order: orderResponse(order) })
  } catch (error) {
    if (error instanceof PricingError && error.code === "QUOTE_NOT_AVAILABLE") {
      const response = await existingOrderResponse(found.id)
      if (response) return response
      return NextResponse.json(
        { error: "This quote has expired. Request a new price.", code: "QUOTE_EXPIRED" },
        { status: 410 },
      )
    }
    console.error("Quote confirmation error:", error)
    return NextResponse.json({ error: "Unable to create your order." }, { status: 500 })
  }
}

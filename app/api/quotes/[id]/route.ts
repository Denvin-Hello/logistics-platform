import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/security"
import { calculateDeliveryPrice, parsePricingConfig } from "@/lib/pricing"
import { expireQuoteIfNeeded, QUOTE_STATUS, quoteParcels, quoteSummary } from "@/lib/quote-order"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const found = await prisma.quote.findFirst({
    where: { id: params.id, customerId: session.user.id },
    include: { order: { select: { id: true, orderNumber: true } } },
  })

  if (!found) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 })
  }

  const quote = await expireQuoteIfNeeded(found)
  let breakdown = null

  if (quote.status === QUOTE_STATUS.OPEN) {
    try {
      const config = parsePricingConfig(quote.pricingSnapshot)
      const price = calculateDeliveryPrice({
        distanceKm: quote.distanceKm,
        distanceM: quote.distanceM,
        parcels: quoteParcels(quote),
        config,
      })
      breakdown = {
        distanceLines: price.distanceLines,
        weightLines: price.weightLines,
      }
    } catch {
      breakdown = null
    }
  }

  return NextResponse.json({
    success: true,
    quote: quoteSummary(quote),
    breakdown,
    orderId: found.order?.id ?? null,
    orderNumber: found.order?.orderNumber ?? null,
  })
}

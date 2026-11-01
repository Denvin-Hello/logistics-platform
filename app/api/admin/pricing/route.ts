import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { PricingError } from "@/lib/pricing"
import { loadActivePricingConfig, savePricingConfig } from "@/lib/pricing-config"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "ADMIN") return null
  return session
}

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { row, config } = await loadActivePricingConfig()
    const history = await prisma.pricingConfig.findMany({
      orderBy: { version: "desc" },
      take: 20,
      select: {
        id: true,
        version: true,
        isActive: true,
        baseFare: true,
        minimumFare: true,
        distanceBands: true,
        distanceRates: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      active: { id: row.id, version: row.version, ...config },
      history,
    })
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 })
    }
    console.error("Pricing config read error:", error)
    return NextResponse.json({ error: "Unable to read pricing configuration." }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const rate = rateLimit(request, { limit: 20, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const config = (body as { config?: unknown })?.config ?? body
    const row = await savePricingConfig(config, session.user.id)

    return NextResponse.json({
      success: true,
      config: {
        id: row.id,
        version: row.version,
        isActive: row.isActive,
      },
    })
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    console.error("Pricing config save error:", error)
    return NextResponse.json({ error: "Unable to save pricing configuration." }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"
import { writeLocation, getLatestLocation } from "@/lib/locations"
import { handleDbError } from "@/lib/db-error"

const locationSchema = z.object({
  orderId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export async function POST(req: NextRequest) {
  const rate = rateLimit(req, { limit: 120, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = locationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    await writeLocation({
      orderId: parsed.data.orderId,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      userId: session.user.id,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleDbError(err)
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get("orderId")

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 })
  }

  try {
    const location = await getLatestLocation(orderId)

    return NextResponse.json(location, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    return handleDbError(err)
  }
}

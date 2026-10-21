import { type NextRequest, NextResponse } from "next/server"
import { geocodeAddress } from "@/lib/geocode"
import { rateLimit } from "@/lib/security"

export const dynamic = "force-dynamic"

// Thin server-side proxy for the map components. Keeps Nominatim usage on the
// server (User-Agent policy + shared cache) instead of the browser.
export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const q = request.nextUrl.searchParams.get("q") ?? request.nextUrl.searchParams.get("address")
  if (!q || q.trim().length < 3) {
    return NextResponse.json({ error: "Missing or too-short address." }, { status: 400 })
  }

  const point = await geocodeAddress(q)
  if (!point) {
    return NextResponse.json({ error: "Could not locate that address." }, { status: 404 })
  }

  return NextResponse.json(point)
}

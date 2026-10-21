import { prisma } from "@/lib/prisma"

// Server-side geocoding with a persistent cache. Kept behind a small interface so
// the provider can be swapped (Mapbox/Google/OpenCage) via env without touching
// callers once Nominatim's usage policy becomes a constraint.

export interface GeoPoint {
  lat: number
  lng: number
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

function userAgent() {
  return (
    process.env.GEOCODE_USER_AGENT ||
    `LoggiConnect/1.0 (+https://loggiconnect.co.za; ${process.env.ADMIN_EMAIL || "support@loggiconnect.co.za"})`
  )
}

export async function geocodeAddress(
  address: string | null | undefined,
  opts?: { timeoutMs?: number },
): Promise<GeoPoint | null> {
  const query = (address || "").trim()
  if (!query) return null

  const key = query.toLowerCase()

  try {
    const cached = await prisma.geocodeCache.findUnique({ where: { query: key } })
    if (cached) return { lat: cached.lat, lng: cached.lng }
  } catch {
    // Cache is best-effort; fall through to the live lookup.
  }

  const timeoutMs = opts?.timeoutMs ?? 4000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(query)}`
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": userAgent() },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const lat = Number.parseFloat(data[0]?.lat)
    const lng = Number.parseFloat(data[0]?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    try {
      await prisma.geocodeCache.upsert({
        where: { query: key },
        update: { lat, lng },
        create: { query: key, lat, lng },
      })
    } catch {
      // Ignore cache write failures.
    }

    return { lat, lng }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function geocodePair(
  pickup: string,
  delivery: string,
  opts?: { timeoutMs?: number },
): Promise<{ pickup: GeoPoint | null; delivery: GeoPoint | null }> {
  const [p, d] = await Promise.all([
    geocodeAddress(pickup, opts),
    geocodeAddress(delivery, opts),
  ])
  return { pickup: p, delivery: d }
}

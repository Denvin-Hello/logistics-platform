import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"

dotenv.config({ path: ".env.local" })
dotenv.config()

const prisma = new PrismaClient()
const dryRun = process.argv.includes("--dry-run")
const limit = Number(process.env.BACKFILL_LIMIT || 200)
const userAgent =
  process.env.GEOCODE_USER_AGENT ||
  `LoggiConnect/1.0 (+https://loggiconnect.co.za; ${process.env.ADMIN_EMAIL || "support@loggiconnect.co.za"})`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function geocode(query) {
  const key = query.trim().toLowerCase()
  if (!key) return null

  const cached = await prisma.geocodeCache.findUnique({ where: { query: key } })
  if (cached) return { lat: cached.lat, lng: cached.lng, cached: true }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(query)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": userAgent },
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const lat = Number.parseFloat(data[0]?.lat)
    const lng = Number.parseFloat(data[0]?.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    await prisma.geocodeCache.upsert({
      where: { query: key },
      update: { lat, lng },
      create: { query: key, lat, lng },
    })
    return { lat, lng, cached: false }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      serviceArea: { not: null },
      OR: [{ serviceAreaLat: null }, { serviceAreaLng: null }],
    },
    select: { id: true, serviceArea: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  })

  console.log(`${providers.length} provider service area(s) need geocoding${dryRun ? " (dry run)" : ""}.`)

  let updated = 0
  let skipped = 0

  for (const provider of providers) {
    const area = provider.serviceArea?.trim()
    if (!area) {
      skipped += 1
      continue
    }

    const point = await geocode(area)
    if (!point) {
      console.warn(`Could not geocode ${provider.id}: ${area}`)
      skipped += 1
      if (!point?.cached) await sleep(1100)
      continue
    }

    if (!dryRun) {
      await prisma.user.update({
        where: { id: provider.id },
        data: { serviceAreaLat: point.lat, serviceAreaLng: point.lng },
      })
    }
    updated += 1
    console.log(`Geocoded ${provider.id}: ${area} -> ${point.lat}, ${point.lng}${point.cached ? " (cached)" : ""}`)
    if (!point.cached) await sleep(1100)
  }

  console.log(`Done. updated=${updated} skipped=${skipped}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

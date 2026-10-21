import type { Prisma } from "@prisma/client"
import { haversineDistanceM, type GeoPoint } from "@/lib/geo"
import { prisma } from "@/lib/prisma"
import { ROUTE_CACHE_TTL_MS } from "@/lib/trip-config"

export type RouteGeometry = [number, number][]

export interface RouteResult {
  geometry: RouteGeometry
  distanceM: number
  durationS: number
  isFallback: boolean
}

const OSRM_BASE_URL = (process.env.ROUTING_OSRM_URL || "https://router.project-osrm.org").replace(/\/+$/, "")
const OSRM_TIMEOUT_MS = 5000
const FALLBACK_TTL_MS = 60_000
const fallbackCache = new Map<string, { route: RouteResult; expiresAt: number }>()

function cacheKey(from: GeoPoint, to: GeoPoint) {
  const point = (p: GeoPoint) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`
  return `driving:${point(from)};${point(to)}`
}

function isGeometry(value: unknown): value is RouteGeometry {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        typeof point[0] === "number" &&
        typeof point[1] === "number",
    )
  )
}

function fallbackRoute(from: GeoPoint, to: GeoPoint): RouteResult {
  const distanceM = Math.round(haversineDistanceM(from, to))
  return {
    geometry: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distanceM,
    durationS: Math.max(60, Math.round(distanceM / 11.11)),
    isFallback: true,
  }
}

async function fetchOsrmRoute(from: GeoPoint, to: GeoPoint): Promise<RouteResult | null> {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coordinates}?overview=simplified&geometries=geojson&alternatives=false&steps=false`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) return null

    const data = await res.json()
    if (data?.code !== "Ok" || !Array.isArray(data?.routes) || data.routes.length === 0) {
      return null
    }

    const route = data.routes[0]
    const raw = route?.geometry?.coordinates
    if (!Array.isArray(raw) || raw.length < 2) return null

    const geometry: RouteGeometry = raw.map((pair: unknown) => {
      if (!Array.isArray(pair) || pair.length < 2) return null
      const lng = Number(pair[0])
      const lat = Number(pair[1])
      return Number.isFinite(lat) && Number.isFinite(lng) ? ([lat, lng] as [number, number]) : null
    }).filter((pair: [number, number] | null): pair is [number, number] => pair !== null)

    if (geometry.length < 2) return null

    const distanceM = Number(route.distance)
    const durationS = Number(route.duration)
    if (!Number.isFinite(distanceM) || !Number.isFinite(durationS)) return null

    return {
      geometry,
      distanceM: Math.round(distanceM),
      durationS: Math.round(durationS),
      isFallback: false,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function getRoute(from: GeoPoint, to: GeoPoint): Promise<RouteResult> {
  const key = cacheKey(from, to)
  const cachedFallback = fallbackCache.get(key)
  if (cachedFallback && cachedFallback.expiresAt > Date.now()) {
    return cachedFallback.route
  }

  try {
    const cached = await prisma.routeCache.findUnique({ where: { key } })
    if (cached && Date.now() - cached.updatedAt.getTime() < ROUTE_CACHE_TTL_MS) {
      const geometry = cached.geometry
      if (isGeometry(geometry)) {
        return {
          geometry,
          distanceM: cached.distanceM,
          durationS: cached.durationS,
          isFallback: false,
        }
      }
    }
  } catch {
    // Cache is best-effort; fall through to OSRM.
  }

  const route = await fetchOsrmRoute(from, to)
  if (!route) {
    const fallback = fallbackRoute(from, to)
    fallbackCache.set(key, { route: fallback, expiresAt: Date.now() + FALLBACK_TTL_MS })
    return fallback
  }

  try {
    await prisma.routeCache.upsert({
      where: { key },
      update: {
        geometry: route.geometry as unknown as Prisma.InputJsonValue,
        distanceM: route.distanceM,
        durationS: route.durationS,
      },
      create: {
        key,
        geometry: route.geometry as unknown as Prisma.InputJsonValue,
        distanceM: route.distanceM,
        durationS: route.durationS,
      },
    })
  } catch {
    // Ignore cache write failures.
  }

  return route
}

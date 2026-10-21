export interface GeoPoint {
  lat: number
  lng: number
}

const EARTH_RADIUS_M = 6_371_000

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function haversineDistanceM(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM) || distanceM < 0) return "—"
  if (distanceM < 1000) return `${Math.round(distanceM)} m`
  return `${(distanceM / 1000).toFixed(1)} km`
}

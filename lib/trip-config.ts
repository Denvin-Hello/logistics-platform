function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// Providers must be within this distance of the delivery coordinates before
// they can complete the trip. Dispatch can override when GPS is unavailable.
export const ARRIVAL_RADIUS_M = positiveNumber(process.env.TRIP_ARRIVAL_RADIUS_M, 150)

// A position with a worse accuracy than this is not reliable enough to prove
// arrival; providers are asked to move to a clearer spot instead.
export const MAX_GPS_ACCURACY_M = positiveNumber(process.env.TRIP_MAX_GPS_ACCURACY_M, 100)

export const ROUTE_CACHE_TTL_MS =
  positiveNumber(process.env.ROUTE_CACHE_TTL_HOURS, 24) * 60 * 60 * 1000

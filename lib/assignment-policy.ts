export interface AssignmentPolicy {
  maxActiveJobs: number
  radiusKm: number
  offerTtlMs: number
  escalateAfterMs: number
  urgentAfterMs: number
  widenRadiusKm: number
  offerCount: number
  urgentOfferCount: number
  maxAttempts: number
}

function envInt(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = env[name]
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function getAssignmentPolicy(env: NodeJS.ProcessEnv = process.env): AssignmentPolicy {
  return {
    maxActiveJobs: envInt(env, "ASSIGNMENT_MAX_ACTIVE_JOBS", 1, 1, 20),
    radiusKm: envInt(env, "ASSIGNMENT_RADIUS_KM", 50, 1, 500),
    offerTtlMs: envInt(env, "ASSIGNMENT_OFFER_TTL_MIN", 10, 1, 120) * 60_000,
    escalateAfterMs: envInt(env, "ASSIGNMENT_ESCALATE_MIN", 15, 1, 240) * 60_000,
    urgentAfterMs: envInt(env, "ASSIGNMENT_URGENT_MIN", 30, 1, 480) * 60_000,
    widenRadiusKm: envInt(env, "ASSIGNMENT_WIDEN_RADIUS_KM", 25, 0, 500),
    offerCount: envInt(env, "ASSIGNMENT_OFFER_COUNT", 3, 1, 20),
    urgentOfferCount: envInt(env, "ASSIGNMENT_URGENT_OFFER_COUNT", 8, 1, 50),
    maxAttempts: envInt(env, "ASSIGNMENT_MAX_ATTEMPTS", 6, 1, 50),
  }
}

export function isAutoAssignmentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUTO_ASSIGNMENT_ENABLED === "true"
}

export function shouldEmailOffers(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ASSIGNMENT_EMAIL_OFFERS !== "false"
}

export function isOpenPoolAfterEscalation(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ASSIGNMENT_OPEN_POOL !== "false"
}

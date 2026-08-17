// In-memory rate limiter (per-IP). For production scale use Redis/Upstash.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  req: Request,
  { limit, windowMs }: { limit: number; windowMs: number },
): { ok: boolean; retryAfter?: number } {
  const ip =
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  const now = Date.now()
  const bucket = buckets.get(ip)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  bucket.count += 1

  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  return { ok: true }
}

// Lightweight CSRF protection for cookie-authenticated APIs: reject cross-origin
// requests. Server-to-server calls (no Origin header) are allowed through.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin")
  if (!origin) return true
  try {
    const originHost = new URL(origin).host
    const requestHost = new URL(req.url).host
    return originHost === requestHost
  } catch {
    return false
  }
}

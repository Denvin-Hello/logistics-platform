import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { recordSignupConsent } from "@/lib/consent"

export const dynamic = "force-dynamic"

const consentSchema = z.object({
  accept: z.boolean().refine((value) => value === true, "Accept the Terms of Service and Privacy Policy."),
})

export async function POST(request: NextRequest) {
  const rate = rateLimit(request, { limit: 10, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const parsed = consentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 },
    )
  }

  await recordSignupConsent(session.user.id)
  return NextResponse.json({ ok: true })
}

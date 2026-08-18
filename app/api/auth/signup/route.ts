import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { sendProviderSignupNotification } from "@/lib/email"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(254),
  name: z.string().min(1, "Please enter your name.").max(120),
  role: z.enum(["customer", "provider"]).default("customer"),
  businessName: z.string().max(160).optional(),
})

export async function POST(req: Request) {
  const rate = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 })
    }

    const { email, name, role, businessName } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()
    const isProvider = role === "provider"

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (existing) {
      // Same role → re-request a magic link. Different role → generic message
      // (no enumeration of account existence or role).
      if (existing.role === (isProvider ? "PROVIDER" : "CUSTOMER")) {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 })
    }

    try {
      await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          role: isProvider ? "PROVIDER" : "CUSTOMER",
          status: isProvider ? "PENDING" : "APPROVED",
          businessName: isProvider ? (businessName || "").trim() || null : null,
        },
      })
    } catch (err: unknown) {
      // Unique constraint: another request created the user between check and create.
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
        return NextResponse.json({ ok: true })
      }
      throw err
    }

    if (isProvider) {
      void sendProviderSignupNotification({
        name: name.trim(),
        businessName: (businessName || "").trim() || null,
        email: normalizedEmail,
      }).catch((err) => {
        console.error("Provider notification email failed:", err)
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Unable to create your account. Please try again." }, { status: 500 })
  }
}
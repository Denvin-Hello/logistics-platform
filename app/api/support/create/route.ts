import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"

const supportSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(4000),
  orderId: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  const rate = rateLimit(req, { limit: 5, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 })
  }

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = supportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 })
    }

    await prisma.supportTicket.create({
      data: {
        subject: parsed.data.subject,
        message: parsed.data.message,
        orderId: parsed.data.orderId || null,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error("Support create error", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
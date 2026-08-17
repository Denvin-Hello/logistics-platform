import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"

const reviewSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "decline"]),
  reason: z.string().max(500).optional(),
})

export async function POST(req: Request) {
  const rate = rateLimit(req, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = reviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const { userId, action, reason } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user || user.role !== "PROVIDER") {
      return NextResponse.json({ error: "Provider not found." }, { status: 404 })
    }

    if (action === "approve") {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "APPROVED", declinedReason: null },
      })
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "DECLINED", declinedReason: (reason || "").trim() || null },
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to update the application." }, { status: 500 })
  }
}
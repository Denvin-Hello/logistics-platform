import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { recordAudit } from "@/lib/audit"
import { z } from "zod"

const schema = z.object({
  isAvailable: z.boolean(),
})

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const provider = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAvailable: true },
  })

  return NextResponse.json({ isAvailable: provider?.isAvailable ?? false })
}

export async function PATCH(request: NextRequest) {
  const rate = rateLimit(request, { limit: 30, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER" || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid availability value." }, { status: 400 })
  }

  const provider = await prisma.user.update({
    where: { id: session.user.id },
    data: { isAvailable: parsed.data.isAvailable },
    select: { isAvailable: true },
  })

  await recordAudit({
    actorId: session.user.id,
    action: "provider.availability.updated",
    entityType: "User",
    entityId: session.user.id,
    metadata: { isAvailable: provider.isAvailable },
  })

  return NextResponse.json({ isAvailable: provider.isAvailable })
}

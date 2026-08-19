import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authOptions } from "@/lib/auth"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } })

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 })
    }

    await prisma.supportTicket.update({
      where: { id: params.id },
      data: { status: parsed.data.status },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Unable to update the ticket." }, { status: 500 })
  }
}
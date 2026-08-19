import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { prisma } from "@/lib/prisma"

const SESSION_MAX_AGE = 30 * 24 * 60 * 60

const SEED_ACCOUNTS: Record<
  string,
  { email: string; role: "ADMIN" | "PROVIDER" | "CUSTOMER"; status: "APPROVED" | "PENDING"; name: string; businessName?: string }
> = {
  ADMIN: { email: "admin@tdlco.com", role: "ADMIN", status: "APPROVED", name: "Platform Admin" },
  PROVIDER: {
    email: "ramsiladenvin@gmail.com",
    role: "PROVIDER",
    status: "APPROVED",
    name: "TDL CO Logistics",
    businessName: "TDL CO Logistics",
  },
  PROVIDER_PENDING: {
    email: "newprovider@test.com",
    role: "PROVIDER",
    status: "PENDING",
    name: "Mokoena Logistics",
    businessName: "Mokoena Logistics",
  },
  CUSTOMER: { email: "customer@demo.local", role: "CUSTOMER", status: "APPROVED", name: "Demo Customer" },
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let role: string
  try {
    const body = await request.json()
    role = body?.role
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const seed = SEED_ACCOUNTS[role]

  if (!seed) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  let user = await prisma.user.findUnique({ where: { email: seed.email } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: seed.email,
        name: seed.name,
        role: seed.role,
        status: seed.status,
        businessName: seed.businessName || null,
      },
    })
  }

  const token = randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000)

  await prisma.session.create({
    data: { sessionToken: token, userId: user.id, expires },
  })

  const redirect =
    user.role === "ADMIN"
      ? "/admin"
      : user.role === "PROVIDER"
        ? user.status === "APPROVED"
          ? "/provider"
          : "/application-status"
        : "/customer"

  const response = NextResponse.json({ ok: true, redirect })
  response.cookies.set("next-auth.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  })

  return response
}
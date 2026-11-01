import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSameOrigin, rateLimit } from "@/lib/security"
import { geocodeAddress } from "@/lib/geocode"
import { recordAudit } from "@/lib/audit"
import { z } from "zod"

const schema = z.object({
  businessName: z.string().max(160).optional(),
  phone: z.string().max(50).optional(),
  serviceArea: z.string().max(160).optional(),
  serviceRadiusKm: z.coerce.number().int().min(1).max(500).optional(),
  vehicleType: z.string().max(120).optional(),
  vehicleCapacityKg: z.coerce.number().int().min(0).max(50000).optional(),
})

const select = {
  businessName: true,
  phone: true,
  serviceArea: true,
  serviceAreaLat: true,
  serviceAreaLng: true,
  serviceRadiusKm: true,
  vehicleType: true,
  vehicleCapacityKg: true,
} as const

export async function GET(request: NextRequest) {
  const rate = rateLimit(request, { limit: 60, windowMs: 60_000 })
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.user.findUnique({ where: { id: session.user.id }, select })
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 })

  return NextResponse.json({ profile })
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
  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request." }, { status: 400 })
  }

  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { serviceArea: true, serviceAreaLat: true, serviceAreaLng: true },
  })
  if (!current) return NextResponse.json({ error: "Profile not found." }, { status: 404 })

  const data = parsed.data
  const serviceArea =
    data.serviceArea === undefined ? undefined : data.serviceArea.trim() || null
  const serviceAreaChanged = serviceArea !== undefined && serviceArea !== current.serviceArea
  const point = serviceArea && (serviceAreaChanged || current.serviceAreaLat == null)
    ? await geocodeAddress(serviceArea)
    : null

  const profile = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.businessName !== undefined
        ? { businessName: data.businessName.trim() || null }
        : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() || null } : {}),
      ...(serviceArea !== undefined ? { serviceArea } : {}),
      ...(serviceAreaChanged || point
        ? {
            serviceAreaLat: point?.lat ?? null,
            serviceAreaLng: point?.lng ?? null,
          }
        : {}),
      ...(data.serviceRadiusKm !== undefined ? { serviceRadiusKm: data.serviceRadiusKm } : {}),
      ...(data.vehicleType !== undefined ? { vehicleType: data.vehicleType.trim() || null } : {}),
      ...(data.vehicleCapacityKg !== undefined
        ? { vehicleCapacityKg: data.vehicleCapacityKg }
        : {}),
    },
    select,
  })

  await recordAudit({
    actorId: session.user.id,
    action: "provider.profile.updated",
    entityType: "User",
    entityId: session.user.id,
    metadata: { serviceAreaChanged, geocoded: Boolean(point) },
  })

  return NextResponse.json({ profile, geocoded: Boolean(point) })
}

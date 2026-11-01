import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"

dotenv.config({ path: ".env.local" })
dotenv.config()

const prisma = new PrismaClient()
const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:3011"
const customerEmail = "dispatch-smoke-customer@demo.local"
const providerBusinessName = "Dispatch Smoke Provider"
const marker = randomBytes(6).toString("hex")

async function deleteUsers(ids) {
  if (ids.length === 0) return

  await prisma.auditLog.deleteMany({
    where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
  })
  await prisma.quote.deleteMany({ where: { customerId: { in: ids } } })
  await prisma.order.deleteMany({
    where: { OR: [{ customerId: { in: ids } }, { assignedProviderId: { in: ids } }] },
  })
  await prisma.session.deleteMany({ where: { userId: { in: ids } } })
  await prisma.account.deleteMany({ where: { userId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}

async function cleanupExisting() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: customerEmail },
        { businessName: providerBusinessName },
      ],
    },
    select: { id: true },
  })
  await deleteUsers(users.map((user) => user.id))
}

async function createSession(userId) {
  const token = randomBytes(32).toString("hex")
  await prisma.session.create({
    data: {
      sessionToken: token,
      userId,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  })
  return token
}

async function createFixture() {
  const [customer, provider, admin, config] = await Promise.all([
    prisma.user.create({
      data: {
        email: customerEmail,
        name: "Dispatch Smoke Customer",
        role: "CUSTOMER",
        status: "APPROVED",
      },
    }),
    prisma.user.create({
      data: {
        email: null,
        name: "Dispatch Smoke Provider",
        businessName: providerBusinessName,
        role: "PROVIDER",
        status: "APPROVED",
        isAvailable: true,
        serviceArea: "Cape Town CBD",
        serviceAreaLat: -33.9249,
        serviceAreaLng: 18.4241,
        serviceRadiusKm: 50,
        vehicleType: "VAN_1T",
        vehicleCapacityKg: 1000,
        complianceGraceUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.findUnique({ where: { email: "admin@tdlco.com" } }),
    prisma.pricingConfig.findFirst({
      where: { isActive: true },
      orderBy: { version: "desc" },
    }),
  ])

  if (!config) throw new Error("No active pricing config found")
  if (!admin) throw new Error("No admin account found")

  const [customerToken, providerToken, adminToken] = await Promise.all([
    createSession(customer.id),
    createSession(provider.id),
    createSession(admin.id),
  ])

  const quote = await prisma.quote.create({
    data: {
      customerId: customer.id,
      status: "OPEN",
      source: "FORM",
      pickupAddress: "Cape Town CBD",
      pickupPhone: "+27 21 000 0001",
      pickupDate: "2026-10-27",
      pickupTime: "09:00",
      deliveryAddress: "Sea Point",
      deliveryName: "Smoke Recipient",
      deliveryPhone: "+27 21 000 0002",
      deliveryInstructions: "Dispatch smoke test",
      pickupLat: -33.9249,
      pickupLng: 18.4241,
      deliveryLat: -33.9145,
      deliveryLng: 18.3852,
      distanceM: 4200,
      distanceKm: 4.2,
      parcels: [
        {
          packageType: "small_parcel",
          catalogCategory: null,
          catalogSubcategory: null,
          itemKey: null,
          itemLabel: null,
          description: "Smoke test parcel",
          lengthCm: 30,
          widthCm: 20,
          heightCm: 15,
          actualWeightKg: 5,
          quantity: 1,
          chargeableWeightKg: 5,
          volumeM3: 0.009,
        },
      ],
      chargeableWeightKg: 5,
      baseFare: 100,
      distanceFare: 50,
      weightFare: 20,
      subtotal: 170,
      total: 170,
      currency: "ZAR",
      pricingConfigId: config.id,
      pricingConfigVersion: config.version,
      pricingSnapshot: { version: config.version, smoke: marker },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  })

  return { customer, provider, admin, quote, customerToken, providerToken, adminToken }
}

async function request(path, init = {}, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Cookie: `next-auth.session-token=${token}` } : {}),
    },
  })
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { response, body }
}

async function main() {
  await cleanupExisting()
  const fixture = await createFixture()
  const { customer, provider, admin, quote, customerToken, providerToken, adminToken } = fixture
  const result = { marker, quoteId: quote.id }

  try {
    const confirm = await request(
      `/api/quotes/${quote.id}/confirm`,
      { method: "POST", body: JSON.stringify({}) },
      customerToken,
    )
    assert.equal(confirm.response.status, 200, JSON.stringify(confirm.body))
    assert.equal(confirm.body?.success, true)
    const orderId = confirm.body?.order?.id
    assert.ok(orderId, "order id missing")
    result.orderId = orderId
    result.orderNumber = confirm.body?.order?.orderId

    const offers = await prisma.orderOffer.findMany({
      where: { orderId, providerId: provider.id },
    })
    assert.equal(offers.length, 1, "expected one targeted offer")
    assert.equal(offers[0].status, "PENDING")
    assert.ok(offers[0].expiresAt.getTime() > Date.now())
    result.offerId = offers[0].id

    const retry = await request(
      `/api/admin/dispatch/${orderId}`,
      { method: "POST", body: JSON.stringify({ action: "retry" }) },
      adminToken,
    )
    assert.equal(retry.response.status, 200, JSON.stringify(retry.body))
    assert.equal(retry.body?.ok, true)
    result.adminRetryCreated = retry.body?.created

    const availability = await request(
      "/api/provider/availability",
      { method: "PATCH", body: JSON.stringify({ isAvailable: false }) },
      providerToken,
    )
    assert.equal(availability.response.status, 200, JSON.stringify(availability.body))
    assert.equal(availability.body?.isAvailable, false)
    const availabilityBack = await request(
      "/api/provider/availability",
      { method: "PATCH", body: JSON.stringify({ isAvailable: true }) },
      providerToken,
    )
    assert.equal(availabilityBack.body?.isAvailable, true)

    const accept = await request(
      `/api/provider/orders/${orderId}`,
      { method: "PATCH", body: JSON.stringify({ action: "accept" }) },
      providerToken,
    )
    assert.equal(accept.response.status, 200, JSON.stringify(accept.body))
    assert.equal(accept.body?.status, "ASSIGNED")

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    const acceptedOffer = await prisma.orderOffer.findUnique({ where: { id: offers[0].id } })
    assert.equal(order?.status, "ASSIGNED")
    assert.equal(order?.assignedProviderId, provider.id)
    assert.equal(acceptedOffer?.status, "ACCEPTED")

    const tracking = await request(
      `/api/tracking/${encodeURIComponent(order.orderNumber)}?email=${encodeURIComponent(customerEmail)}`,
    )
    assert.equal(tracking.response.status, 200, JSON.stringify(tracking.body))
    assert.equal(tracking.body?.statusKey, "ASSIGNED")
    assert.ok(tracking.body?.liveTracking, "live tracking payload missing")

    const cronUnauthorized = await request("/api/cron/assignment-sweep")
    assert.equal(cronUnauthorized.response.status, 401)
    result.trackingStatus = tracking.body?.statusKey
    result.ok = true
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await prisma.auditLog.deleteMany({ where: { entityId: result.orderId || quote.id } })
    await prisma.session.deleteMany({ where: { sessionToken: adminToken } })
    await deleteUsers([provider.id, customer.id])
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

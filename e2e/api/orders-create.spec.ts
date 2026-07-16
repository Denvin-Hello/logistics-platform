import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

const TEST_EMAIL = "test@example.com"

const mockSession = (email = TEST_EMAIL, role = "CUSTOMER") => ({
  user: { id: "test-id", email, name: "Test User", role },
  expires: new Date(Date.now() + 86400000).toISOString(),
})

async function createMockRequest(body: object) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as NextRequest
}

describe("POST /api/orders/create", () => {
  let prisma: any

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client")
    prisma = new PrismaClient()
    await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: {
        id: "orders-test-user",
        email: TEST_EMAIL,
        name: "Test User",
        role: "CUSTOMER",
      },
    })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({})
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 400 when order details are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({})
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe("Missing order details")
  })

  it("creates an order and returns correct amount", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({
      orderDetails: {
        customerName: "John Doe",
        customerEmail: TEST_EMAIL,
        pickupAddress: "123 Main St",
        pickupPhone: "+27 82 123 4567",
        deliveryAddress: "456 Oak Ave",
        deliveryName: "Jane Doe",
        deliveryPhone: "+27 83 234 5678",
        packageType: "electronics",
        weight: "2.5",
        length: "30",
        width: "20",
        height: "15",
        fragile: true,
        insurance: true,
        signature: true,
      },
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order.orderId).toMatch(/^ORD\d+$/)
    expect(body.order.amount).toBeGreaterThan(0)
    expect(body.order.customerEmail).toBe(TEST_EMAIL)
  })

  it("calculates amount correctly for basic delivery", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({
      orderDetails: {
        customerName: "Basic User",
        customerEmail: TEST_EMAIL,
        pickupAddress: "Addr 1",
        pickupPhone: "+27 82 123 4567",
        deliveryAddress: "Addr 2",
        deliveryName: "Recipient",
        deliveryPhone: "+27 83 234 5678",
        packageType: "documents",
        weight: "1",
        length: "10",
        width: "10",
        height: "10",
        fragile: false,
        insurance: false,
        signature: false,
      },
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.order.amount).toBe(120)
  })

  it("applies surcharges for fragile + insurance + signature", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({
      orderDetails: {
        customerName: "Premium User",
        customerEmail: TEST_EMAIL,
        pickupAddress: "Addr 1",
        pickupPhone: "+27 82 123 4567",
        deliveryAddress: "Addr 2",
        deliveryName: "Recipient",
        deliveryPhone: "+27 83 234 5678",
        packageType: "fragile",
        weight: "1",
        length: "10",
        width: "10",
        height: "10",
        fragile: true,
        insurance: true,
        signature: true,
      },
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.order.amount).toBe(185)
  })

  it("persists order in database", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({
      orderDetails: {
        customerName: "DB Test",
        customerEmail: TEST_EMAIL,
        pickupAddress: "Addr 1",
        pickupPhone: "+27 82 123 4567",
        deliveryAddress: "Addr 2",
        deliveryName: "Recipient",
        deliveryPhone: "+27 83 234 5678",
        packageType: "documents",
        weight: "1",
        length: "10",
        width: "10",
        height: "10",
        fragile: false,
        insurance: false,
        signature: false,
      },
    })
    const res = await POST(req)
    const body = await res.json()
    expect(body.success).toBe(true)
    const saved = await prisma.order.findUnique({
      where: { orderNumber: body.order.orderId },
    })
    expect(saved).not.toBeNull()
    expect(saved.customerEmail).toBe(TEST_EMAIL)
    expect(saved.paymentStatus).toBe("PENDING")
    expect(saved.status).toBe("PENDING")
  })

  it("returns 500 for missing required fields like pickupAddress", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/orders/create/route")
    const req = await createMockRequest({
      orderDetails: {
        customerName: "Incomplete",
        customerEmail: TEST_EMAIL,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

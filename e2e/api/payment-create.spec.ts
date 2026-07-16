import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

const CUSTOMER_EMAIL = "customer@test.com"
const CUSTOMER_ID = "cust-id-1"

const mockSession = (email = CUSTOMER_EMAIL, role = "CUSTOMER") => ({
  user: { id: CUSTOMER_ID, email, name: "Test Customer", role },
  expires: new Date(Date.now() + 86400000).toISOString(),
})

async function createMockRequest(body: object) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as NextRequest
}

describe("POST /api/payment/create", () => {
  let prisma: any
  let testOrder: any

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client")
    prisma = new PrismaClient()

    await prisma.user.upsert({
      where: { email: CUSTOMER_EMAIL },
      update: {},
      create: {
        id: CUSTOMER_ID,
        email: CUSTOMER_EMAIL,
        name: "Test Customer",
        role: "CUSTOMER",
      },
    })

    testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD${Date.now()}`,
        customerId: CUSTOMER_ID,
        customerName: "Test Customer",
        customerEmail: CUSTOMER_EMAIL,
        pickupAddress: "123 Pickup St",
        pickupPhone: "+27 82 111 1111",
        deliveryAddress: "456 Delivery Ave",
        deliveryName: "Recipient",
        deliveryPhone: "+27 83 222 2222",
        deliveryInstructions: "",
        length: "0",
        width: "0",
        height: "0",
        packageDescription: "",
        fragile: false,
        insurance: false,
        signatureRequired: false,
        packageType: "documents",
        weight: 1,
        amount: 120,
        description: "Test delivery",
        paymentMethod: "card",
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
  })

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const { POST } = await import("@/app/api/payment/create/route")
    const req = await createMockRequest({ orderDetails: { orderId: testOrder.orderNumber }, paymentMethod: "card" })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 400 when orderId is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/payment/create/route")
    const req = await createMockRequest({ orderDetails: {}, paymentMethod: "card" })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe("Missing order ID")
  })

  it("returns 404 for non-existent order", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/payment/create/route")
    const req = await createMockRequest({
      orderDetails: { orderId: "NONEXISTENT" },
      paymentMethod: "card",
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe("Order not found")
  })

  it("returns 401 when order belongs to another user", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession("other@test.com"))
    const { POST } = await import("@/app/api/payment/create/route")
    const req = await createMockRequest({
      orderDetails: { orderId: testOrder.orderNumber },
      paymentMethod: "card",
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("creates a payment and redirects on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/payment/create/route")
    const req = await createMockRequest({
      orderDetails: { orderId: testOrder.orderNumber },
      paymentMethod: "card",
    })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.paymentId).toMatch(/^PF_\d+$/)
    expect(body.redirectUrl).toContain("/payment/success")
    expect(body.redirectUrl).toContain(testOrder.orderNumber)
  })

  it("updates order status to AWAITING_PAYMENT", async () => {
    const freshOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD${Date.now()}`,
        customerId: CUSTOMER_ID,
        customerName: "Test Customer",
        customerEmail: CUSTOMER_EMAIL,
        pickupAddress: "123 Pickup St",
        pickupPhone: "+27 82 111 1111",
        deliveryAddress: "456 Delivery Ave",
        deliveryName: "Recipient",
        deliveryPhone: "+27 83 222 2222",
        deliveryInstructions: "",
        length: "0",
        width: "0",
        height: "0",
        packageDescription: "",
        fragile: false,
        insurance: false,
        signatureRequired: false,
        packageType: "documents",
        weight: 1,
        amount: 120,
        description: "Test delivery",
        paymentMethod: "card",
        paymentStatus: "PENDING",
        status: "PENDING",
      },
    })
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const { POST } = await import("@/app/api/payment/create/route")
    const req = await createMockRequest({
      orderDetails: { orderId: freshOrder.orderNumber },
      paymentMethod: "eft",
    })
    await POST(req)
    const updated = await prisma.order.findUnique({ where: { id: freshOrder.id } })
    expect(updated.paymentStatus).toBe("PENDING")
    expect(updated.status).toBe("AWAITING_PAYMENT")
  })
})

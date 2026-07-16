import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { NextRequest } from "next/server"
import crypto from "crypto"

const TEST_MERCHANT_KEY = "test-merchant-key"

async function createFormData(data: Record<string, string>) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => formData.append(key, value))
  return {
    formData: vi.fn().mockResolvedValue(formData),
    headers: new Headers(),
  } as unknown as NextRequest
}

function generateSignature(data: Record<string, string>, passphrase: string) {
  const sorted = Object.keys(data)
    .filter((key) => key !== "signature" && data[key] !== "" && data[key] !== null)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(data[key])}`)
    .join("&")
  const stringToHash = sorted + `&passphrase=${passphrase}`
  return crypto.createHash("md5").update(stringToHash).digest("hex")
}

describe("POST /api/payment/notify", () => {
  let prisma: any
  let testOrder: any
  let testProvider: any

  beforeAll(async () => {
    vi.stubEnv("PAYFAST_MERCHANT_KEY", TEST_MERCHANT_KEY)
    const { PrismaClient } = await import("@prisma/client")
    prisma = new PrismaClient()

    testProvider = await prisma.user.upsert({
      where: { email: "provider@notify.com" },
      update: { role: "PROVIDER" },
      create: {
        id: "notify-prov-1",
        email: "provider@notify.com",
        name: "Notify Provider",
        role: "PROVIDER",
      },
    })

    await prisma.user.upsert({
      where: { email: "customer@notify.com" },
      update: {},
      create: {
        id: "notify-cust-1",
        email: "customer@notify.com",
        name: "Notify Customer",
        role: "CUSTOMER",
      },
    })

    testOrder = await prisma.order.create({
      data: {
        orderNumber: `NOTIFY${Date.now()}`,
        customerId: "notify-cust-1",
        customerName: "Notify Customer",
        customerEmail: "customer@notify.com",
        pickupAddress: "Pickup Loc",
        pickupPhone: "+27 82 111 1111",
        deliveryAddress: "Delivery Loc",
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
        amount: 150,
        description: "Test notify",
        paymentMethod: "payfast",
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
      },
    })
  })

  afterAll(async () => {
    await prisma?.$disconnect()
    vi.unstubAllEnvs()
  })

  it("rejects request with invalid signature", async () => {
    const { POST } = await import("@/app/api/payment/notify/route")
    const payload: Record<string, string> = {
      m_payment_id: testOrder.orderNumber,
      pf_payment_id: "PF_TEST_123",
      payment_status: "COMPLETE",
      amount_gross: "150.00",
      item_name: "Test",
      signature: "invalid-signature",
    }
    const req = await createFormData(payload)
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe("Invalid signature")
  })

  it("accepts request with valid signature and COMPLETE status", async () => {
    const { POST } = await import("@/app/api/payment/notify/route")
    const payload: Record<string, string> = {
      m_payment_id: testOrder.orderNumber,
      pf_payment_id: "PF_TEST_456",
      payment_status: "COMPLETE",
      amount_gross: "150.00",
      amount_fee: "5.00",
      amount_net: "145.00",
      item_name: "LogiConnect Delivery Service",
      item_description: "Test delivery",
      name_first: "Notify",
      name_last: "Customer",
      email_address: "customer@notify.com",
      merchant_id: "100001",
    }
    payload.signature = generateSignature(payload, TEST_MERCHANT_KEY)
    const req = await createFormData(payload)
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe("OK")
  })

  it("updates order payment status to PAID after notification", async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `NOTIFY2${Date.now()}`,
        customerId: "notify-cust-1",
        customerName: "Customer 2",
        customerEmail: "customer@notify.com",
        pickupAddress: "Addr",
        pickupPhone: "+27 82 111 1111",
        deliveryAddress: "Addr 2",
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
        packageType: "electronics",
        weight: 1,
        amount: 200,
        description: "Test notify 2",
        paymentMethod: "payfast",
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
      },
    })
    const { POST } = await import("@/app/api/payment/notify/route")
    const payload: Record<string, string> = {
      m_payment_id: order.orderNumber,
      pf_payment_id: "PF_TEST_789",
      payment_status: "COMPLETE",
      amount_gross: "200.00",
      item_name: "LogiConnect Delivery Service",
      email_address: "customer@notify.com",
      merchant_id: "100001",
    }
    payload.signature = generateSignature(payload, TEST_MERCHANT_KEY)
    const req = await createFormData(payload)
    await POST(req)
    const updated = await prisma.order.findUnique({ where: { id: order.id } })
    expect(updated.paymentStatus).toBe("PAID")
    expect(updated.status).toBe("ASSIGNED")
    expect(updated.assignedProviderId).toBe(testProvider.id)
  })

  it("creates a Payment record if one does not exist", async () => {
    const order = await prisma.order.create({
      data: {
        orderNumber: `NOTIFY3${Date.now()}`,
        customerId: "notify-cust-1",
        customerName: "Customer 3",
        customerEmail: "customer@notify.com",
        pickupAddress: "Addr",
        pickupPhone: "+27 82 111 1111",
        deliveryAddress: "Addr 2",
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
        packageType: "clothing",
        weight: 1,
        amount: 100,
        description: "Test notify 3",
        paymentMethod: "payfast",
        paymentStatus: "PENDING",
        status: "AWAITING_PAYMENT",
      },
    })
    const { POST } = await import("@/app/api/payment/notify/route")
    const payload: Record<string, string> = {
      m_payment_id: order.orderNumber,
      pf_payment_id: "PF_NEW_001",
      payment_status: "COMPLETE",
      amount_gross: "100.00",
      item_name: "LogiConnect Delivery Service",
      email_address: "customer@notify.com",
      merchant_id: "100001",
    }
    payload.signature = generateSignature(payload, TEST_MERCHANT_KEY)
    const notifyReq = await createFormData(payload)
    await POST(notifyReq)
    const payments = await prisma.payment.findMany({ where: { orderId: order.id } })
    expect(payments.length).toBeGreaterThan(0)
    expect(payments[0].status).toBe("PAID")
    expect(payments[0].reference).toBe("PF_NEW_001")
  })
})

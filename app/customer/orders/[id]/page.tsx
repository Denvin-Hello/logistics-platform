import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatRands } from "@/lib/format"
import { orderStatusLabel, ORDER_STATUS } from "@/lib/order-status"
import { paymentsMode } from "@/lib/payfast"
import React from "react"
import PrintInvoice from "@/components/customer/print-invoice"
import { PayFastForm } from "@/components/payment/payfast-form"

type Props = { params: { id: string } }

export default async function OrderDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session?.user) return null

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { payments: true, assignedProvider: true },
  })

  if (!order || order.customerId !== session.user.id) {
    return <div className="p-8">Order not found or access denied.</div>
  }

  const mode = paymentsMode()
  const awaitingPayment = order.paymentStatus !== "PAID" && order.status === ORDER_STATUS.AWAITING_PAYMENT

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
        <PrintInvoice order={order} />
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h2 className="font-medium">Pickup</h2>
          <div>{order.pickupAddress}</div>
          <div>{order.pickupPhone}</div>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-medium">Delivery</h2>
          <div>{order.deliveryAddress}</div>
          <div>{order.deliveryPhone}</div>
        </div>
      </section>

      <section className="mt-6 p-4 border rounded">
        <h3 className="font-medium">Details</h3>
        <div>Package: {order.packageType}</div>
        <div>Weight: {order.weight} kg</div>
        <div>Amount: {formatRands(order.amount)}</div>
        <div>Payment status: {order.paymentStatus}</div>
        <div>Status: {orderStatusLabel(order.status)}</div>
      </section>

      {awaitingPayment && mode === "payfast" ? (
        <section className="mt-6">
          <PayFastForm
            orderDetails={{
              orderId: order.orderNumber,
              amount: order.amount,
              description: order.description || "LogiConnect Delivery",
              customerEmail: order.customerEmail,
              customerName: order.customerName,
            }}
          />
        </section>
      ) : awaitingPayment ? (
        <section className="mt-6 p-4 border rounded bg-muted/40">
          <h3 className="font-medium">Payment due on delivery</h3>
          <p className="text-sm text-muted-foreground">
            Please pay {formatRands(order.amount)} to your delivery provider in cash or by card when the package
            arrives.
          </p>
        </section>
      ) : null}

      {order.assignedProvider && (
        <section className="mt-6 p-4 border rounded">
          <h3 className="font-medium">Assigned Provider</h3>
          <div>{order.assignedProvider.name}</div>
        </section>
      )}
    </div>
  )
}

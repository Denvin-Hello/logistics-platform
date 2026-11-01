import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatRands } from "@/lib/format"
import { getCategoryPath } from "@/lib/freight"
import { parcelCatalogPath } from "@/lib/package-catalog"
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
    include: {
      payments: true,
      assignedProvider: true,
      parcels: { orderBy: { sortOrder: "asc" } },
      quote: true,
    },
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
        <div>
          Package: {order.parcels.length > 1
            ? `Multiple parcels (${order.parcels.length})`
            : getCategoryPath(order.packageType).text}
        </div>
        {order.parcels.length > 1 ? (
          <div className="mt-1 text-sm text-muted-foreground">
            {order.parcels
              .map((parcel) => parcelCatalogPath(parcel) ?? getCategoryPath(parcel.packageType).label)
              .join(", ")}
          </div>
        ) : null}
        <div>Weight: {order.weight} kg</div>
        {order.chargeableWeightKg ? <div>Chargeable weight: {order.chargeableWeightKg.toFixed(1)} kg</div> : null}
        {order.distanceKm ? <div>Road distance: {order.distanceKm.toFixed(1)} km</div> : null}
        <div>Amount: {formatRands(order.amount)}</div>
        <div>Payment status: {order.paymentStatus}</div>
        <div>Status: {orderStatusLabel(order.status)}</div>
      </section>

      {order.parcels.length > 0 ? (
        <section className="mt-6 p-4 border rounded">
          <h3 className="font-medium mb-2">Parcels</h3>
          <ul className="space-y-2 text-sm">
            {order.parcels.map((parcel) => (
              <li key={parcel.id} className="rounded border p-3">
                <div className="font-medium">
                  {parcelCatalogPath(parcel) ?? getCategoryPath(parcel.packageType).text}
                </div>
                <div className="text-muted-foreground">
                  {parcel.quantity} × {parcel.length} × {parcel.width} × {parcel.height} cm ·{" "}
                  {parcel.actualWeightKg} kg each
                  {parcel.description ? ` · ${parcel.description}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {order.quote ? (
        <section className="mt-6 p-4 border rounded">
          <h3 className="font-medium mb-2">Pricing</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base fare</span>
              <span>{formatRands(order.quote.baseFare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance fare</span>
              <span>{formatRands(order.quote.distanceFare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight charge</span>
              <span>{formatRands(order.quote.weightFare)}</span>
            </div>
            {order.quote.total > order.quote.subtotal ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum fare applied</span>
                <span>{formatRands(order.quote.total)}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

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

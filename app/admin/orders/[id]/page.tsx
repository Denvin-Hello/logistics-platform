import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formatDateTime, formatRands } from "@/lib/format"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { orderStatusColor, orderStatusLabel, ORDER_STATUS } from "@/lib/order-status"
import { OrderDeliveryOverride } from "@/components/admin/order-delivery-override"

export const dynamic = "force-dynamic"

type Props = { params: { id: string } }

export default async function AdminOrderDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== "ADMIN") {
    return <div className="p-8">Access denied.</div>
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { payments: true, assignedProvider: true, customer: { select: { name: true, email: true } } },
  })

  if (!order) {
    return <div className="p-8">Order not found.</div>
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8 flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
            <p className="text-muted-foreground">Placed {formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>Who placed this order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customer.name || order.customerName}</p>
              <p className="text-muted-foreground">{order.customer.email || order.customerEmail}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>Current order state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={orderStatusColor(order.status)}>{orderStatusLabel(order.status)}</Badge>
                <Badge variant="outline">Payment: {order.paymentStatus}</Badge>
              </div>
              {order.assignedProvider ? (
                <p className="text-sm text-muted-foreground">
                  Provider: {order.assignedProvider.businessName || order.assignedProvider.name}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Provider: not assigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Pickup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.pickupAddress}</p>
              <p className="text-muted-foreground">Phone: {order.pickupPhone}</p>
              <p className="text-muted-foreground">
                {order.pickupDate} {order.pickupTime ? `at ${order.pickupTime}` : ""}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{order.deliveryAddress}</p>
              <p className="text-muted-foreground">Recipient: {order.deliveryName} ({order.deliveryPhone})</p>
              {order.deliveryInstructions ? (
                <p className="text-muted-foreground">Instructions: {order.deliveryInstructions}</p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Package</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.packageType} — {order.description}</p>
            <p className="text-muted-foreground">
              Weight: {order.weight} kg · Dimensions: {order.length} × {order.width} × {order.height} cm
            </p>
            <p className="text-muted-foreground">
              {order.fragile ? "Fragile · " : ""}
              {order.insurance ? "Insured · " : ""}
              {order.signatureRequired ? "Signature required" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dispatch actions</CardTitle>
            <CardDescription>
              Complete the delivery manually only when the provider cannot verify arrival.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order.status === ORDER_STATUS.ASSIGNED || order.status === ORDER_STATUS.IN_TRANSIT ? (
              <OrderDeliveryOverride orderId={order.id} orderNumber={order.orderNumber} />
            ) : (
              <p className="text-sm text-muted-foreground">This delivery is no longer active.</p>
            )}
            {order.deliveryOverrideAt ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-medium">Completed by dispatch override</p>
                <p>{formatDateTime(order.deliveryOverrideAt)}</p>
                <p className="mt-1">Reason: {order.deliveryOverrideReason || "—"}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Amount due: {formatRands(order.amount)}</CardDescription>
          </CardHeader>
          <CardContent>
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <div className="space-y-2">
                {order.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between rounded-2xl bg-muted p-4 text-sm">
                    <div>
                      <p className="font-medium">{payment.method}</p>
                      <p className="text-muted-foreground">{payment.reference || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatRands(payment.amount)}</p>
                      <p className="text-muted-foreground">{payment.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
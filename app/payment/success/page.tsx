import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { formatRands } from "@/lib/format"
import { SUPPORT_EMAIL } from "@/lib/company"
import { CheckCircle, Package, MapPin, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: { payment_id?: string; order_id?: string }
}) {
  const order = searchParams.order_id
    ? await prisma.order.findUnique({ where: { orderNumber: searchParams.order_id } })
    : null

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-green-100 dark:bg-green-900 rounded-full p-3 w-fit mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700 dark:text-green-300">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">
              Your payment has been processed successfully and your delivery order is confirmed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Order Details</h3>
              {order ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>Order ID: {order.orderNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Package: {order.packageType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {order.pickupAddress} → {order.deliveryAddress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Payment: {formatRands(order.amount)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your order has been confirmed. Details were sent to your email.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">What happens next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 w-fit mb-2">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <p className="font-medium">Provider Assignment</p>
                  <p className="text-muted-foreground">We're finding the best delivery provider for your order</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4">
                  <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full p-2 w-fit mb-2">
                    <span className="text-yellow-600 font-bold">2</span>
                  </div>
                  <p className="font-medium">Pickup Scheduled</p>
                  <p className="text-muted-foreground">Provider will contact you to arrange pickup</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full p-2 w-fit mb-2">
                    <span className="text-green-600 font-bold">3</span>
                  </div>
                  <p className="font-medium">Delivery Complete</p>
                  <p className="text-muted-foreground">Track your package in real-time until delivery</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/customer/tracking">Track Your Package</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/customer">Go to Dashboard</Link>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>You will receive email and SMS notifications about your delivery status.</p>
              <p>Need help? Contact our support team at {SUPPORT_EMAIL}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
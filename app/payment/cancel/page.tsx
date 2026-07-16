import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle, ArrowLeft, CreditCard } from "lucide-react"

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto bg-red-100 dark:bg-red-900 rounded-full p-3 w-fit mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-700 dark:text-red-300">Payment Cancelled</CardTitle>
            <CardDescription className="text-lg">
              Your payment was cancelled and no charges were made to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                Your delivery order has been saved and you can complete the payment at any time.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button asChild>
                <Link href="/customer/new-order">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Try Payment Again
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/customer">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Need help with payment? Contact our support team at support@logiconnect.co.za</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

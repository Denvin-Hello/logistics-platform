"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Shield, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"

interface PayFastFormProps {
  orderDetails: {
    orderId: string
    amount: number
    description: string
    customerEmail: string
    customerName: string
  }
  onPaymentSuccess?: (paymentId: string) => void
  onPaymentError?: (error: string) => void
}

interface CheckoutInfo {
  url: string
  fields: Record<string, string>
}

export function PayFastForm({ orderDetails, onPaymentSuccess, onPaymentError }: PayFastFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkout, setCheckout] = useState<CheckoutInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderDetails,
          paymentMethod: "payfast",
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Payment failed")
      }

      onPaymentSuccess?.(result.paymentId)

      // Hosted checkout (PayFast) or simulated demo flow.
      if (result.checkout) {
        setCheckout(result.checkout)
      } else if (result.redirectUrl) {
        window.location.href = result.redirectUrl
      }
    } catch (err) {
      console.error("Payment error:", err)
      const message = err instanceof Error ? err.message : "Payment processing failed. Please try again."
      setError(message)
      onPaymentError?.(message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (checkout) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-6 w-6 text-accent" />
              Redirecting to PayFast...
            </CardTitle>
            <CardDescription>
              You'll be taken to PayFast's secure checkout to complete your payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={(form) => form?.submit()} action={checkout.url} method="POST">
              {Object.entries(checkout.fields).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-accent" />
            Secure Payment
          </CardTitle>
          <CardDescription>Pay securely through PayFast</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Order ID:</span>
                <span className="font-mono">{orderDetails.orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Description:</span>
                <span>{orderDetails.description}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Amount:</span>
                <span>R{orderDetails.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950 p-4 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Security Features */}
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">Secure Payment</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-green-700 dark:text-green-300">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>PCI DSS compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>PayFast verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>Fraud protection</span>
              </div>
            </div>
          </div>

          <form onSubmit={handlePayment} className="space-y-4">
            <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                `Pay R${orderDetails.amount.toFixed(2)} Now`
              )}
            </Button>
          </form>

          {/* PayFast Branding */}
          <div className="text-center pt-4 border-t">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span>Powered by</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                PayFast
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">South Africa's leading payment gateway</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
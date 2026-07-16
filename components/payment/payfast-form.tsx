"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Shield, CheckCircle, AlertCircle } from "lucide-react"

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

export function PayFastForm({ orderDetails, onPaymentSuccess, onPaymentError }: PayFastFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "eft" | "instant-eft">("card")

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderDetails,
          paymentMethod,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // In production, redirect to PayFast or handle the payment response
        onPaymentSuccess?.(result.paymentId)

        // Simulate redirect to success page
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl
        }
      } else {
        throw new Error(result.error || "Payment failed")
      }
    } catch (error) {
      console.error("Payment error:", error)
      onPaymentError?.("Payment processing failed. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-accent" />
            Secure Payment
          </CardTitle>
          <CardDescription>Complete your payment securely through PayFast</CardDescription>
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
              <div className="flex justify-between text-sm">
                <span>Customer:</span>
                <span>{orderDetails.customerName}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total Amount:</span>
                <span>R{orderDetails.amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Payment Method</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                className={`cursor-pointer transition-all ${paymentMethod === "card" ? "ring-2 ring-accent" : ""}`}
                onClick={() => setPaymentMethod("card")}
              >
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="font-medium">Credit/Debit Card</p>
                  <p className="text-xs text-muted-foreground">Visa, Mastercard</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${paymentMethod === "eft" ? "ring-2 ring-accent" : ""}`}
                onClick={() => setPaymentMethod("eft")}
              >
                <CardContent className="p-4 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="font-medium">EFT</p>
                  <p className="text-xs text-muted-foreground">Bank Transfer</p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${paymentMethod === "instant-eft" ? "ring-2 ring-accent" : ""}`}
                onClick={() => setPaymentMethod("instant-eft")}
              >
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-accent" />
                  <p className="font-medium">Instant EFT</p>
                  <p className="text-xs text-muted-foreground">Immediate</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handlePayment} className="space-y-4">
            {paymentMethod === "card" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input id="card-number" placeholder="1234 5678 9012 3456" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-name">Cardholder Name</Label>
                    <Input id="card-name" placeholder="John Smith" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" type="password" required />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "eft" && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">EFT Payment Instructions</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      After clicking "Pay Now", you'll receive banking details to complete your EFT payment. Your order
                      will be processed once payment is confirmed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "instant-eft" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank">Select Your Bank</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absa">ABSA</SelectItem>
                      <SelectItem value="fnb">FNB</SelectItem>
                      <SelectItem value="nedbank">Nedbank</SelectItem>
                      <SelectItem value="standard">Standard Bank</SelectItem>
                      <SelectItem value="capitec">Capitec</SelectItem>
                      <SelectItem value="investec">Investec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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

            <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing Payment...
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

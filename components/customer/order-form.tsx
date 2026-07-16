"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { PayFastForm } from "@/components/payment/payfast-form"
import { MapPin, Package, Clock, DollarSign, Truck } from "lucide-react"

interface OrderDetails {
  orderId: string
  amount: number
  description: string
  customerEmail: string
  customerName: string
}

interface FormData {
  pickupName: string
  pickupPhone: string
  pickupEmail: string
  pickupAddress: string
  pickupDate: string
  pickupTime: string
  deliveryName: string
  deliveryPhone: string
  deliveryAddress: string
  deliveryInstructions: string
  packageType: string
  weight: string
  length: string
  width: string
  height: string
  packageDescription: string
  fragile: boolean
  insurance: boolean
  signature: boolean
}

export function OrderForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)

  const [formData, setFormData] = useState<FormData>({
    pickupName: "",
    pickupPhone: "",
    pickupEmail: "",
    pickupAddress: "",
    pickupDate: "",
    pickupTime: "",
    deliveryName: "",
    deliveryPhone: "",
    deliveryAddress: "",
    deliveryInstructions: "",
    packageType: "documents",
    weight: "1",
    length: "0",
    width: "0",
    height: "0",
    packageDescription: "",
    fragile: false,
    insurance: false,
    signature: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderDetails: {
            customerName: formData.pickupName,
            customerEmail: formData.pickupEmail,
            pickupAddress: formData.pickupAddress,
            pickupPhone: formData.pickupPhone,
            pickupDate: formData.pickupDate,
            pickupTime: formData.pickupTime,
            deliveryAddress: formData.deliveryAddress,
            deliveryName: formData.deliveryName,
            deliveryPhone: formData.deliveryPhone,
            deliveryInstructions: formData.deliveryInstructions,
            packageType: formData.packageType,
            weight: formData.weight,
            length: formData.length,
            width: formData.width,
            height: formData.height,
            packageDescription: formData.packageDescription,
            fragile: formData.fragile,
            insurance: formData.insurance,
            signature: formData.signature,
          },
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to create order")
      }

      setOrderDetails({
        orderId: result.order.orderId,
        amount: result.order.amount,
        description: result.order.description,
        customerEmail: result.order.customerEmail,
        customerName: result.order.customerName,
      })

      setShowPayment(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating your order")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = (paymentId: string) => {
    console.log("Payment successful:", paymentId)
    window.location.href = "/payment/success"
  }

  const handlePaymentError = (errorMessage: string) => {
    console.error("Payment error:", errorMessage)
    setError(errorMessage)
    setShowPayment(false)
  }

  if (showPayment && orderDetails) {
    return (
      <PayFastForm
        orderDetails={orderDetails}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Delivery Order</h1>
        <p className="text-muted-foreground">Fill in the details below to request a delivery</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error ? (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
                {error}
              </div>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-accent" />
                  Pickup Information
                </CardTitle>
                <CardDescription>Where should we collect the package?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-name">Contact Name</Label>
                    <Input
                      id="pickup-name"
                      value={formData.pickupName}
                      placeholder="John Smith"
                      required
                      onChange={(e) => setFormData((prev) => ({ ...prev, pickupName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-phone">Phone Number</Label>
                    <Input
                      id="pickup-phone"
                      value={formData.pickupPhone}
                      type="tel"
                      placeholder="+27 12 345 6789"
                      required
                      onChange={(e) => setFormData((prev) => ({ ...prev, pickupPhone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-email">Email Address</Label>
                  <Input
                    id="pickup-email"
                    type="email"
                    value={formData.pickupEmail}
                    placeholder="john@example.com"
                    required
                    onChange={(e) => setFormData((prev) => ({ ...prev, pickupEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-address">Pickup Address</Label>
                  <Textarea
                    id="pickup-address"
                    value={formData.pickupAddress}
                    placeholder="123 Main Street, Cape Town, 8001"
                    required
                    onChange={(e) => setFormData((prev) => ({ ...prev, pickupAddress: e.target.value }))}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-date">Pickup Date</Label>
                    <Input
                      id="pickup-date"
                      type="date"
                      value={formData.pickupDate}
                      required
                      onChange={(e) => setFormData((prev) => ({ ...prev, pickupDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-time">Preferred Time</Label>
                    <Select value={formData.pickupTime} onValueChange={(value) => setFormData((prev) => ({ ...prev, pickupTime: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                        <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                        <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-accent" />
                  Delivery Information
                </CardTitle>
                <CardDescription>Where should we deliver the package?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-name">Recipient Name</Label>
                    <Input
                      id="delivery-name"
                      value={formData.deliveryName}
                      placeholder="Jane Doe"
                      required
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-phone">Phone Number</Label>
                    <Input
                      id="delivery-phone"
                      type="tel"
                      value={formData.deliveryPhone}
                      placeholder="+27 12 345 6789"
                      required
                      onChange={(e) => setFormData((prev) => ({ ...prev, deliveryPhone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-address">Delivery Address</Label>
                  <Textarea
                    id="delivery-address"
                    value={formData.deliveryAddress}
                    placeholder="456 Oak Avenue, Stellenbosch, 7600"
                    required
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryAddress: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-instructions">Special Instructions</Label>
                  <Textarea
                    id="delivery-instructions"
                    value={formData.deliveryInstructions}
                    placeholder="Ring doorbell, leave at front door if no answer..."
                    onChange={(e) => setFormData((prev) => ({ ...prev, deliveryInstructions: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  Package Information
                </CardTitle>
                <CardDescription>Tell us about what you're sending</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="package-type">Package Type</Label>
                    <Select
                      value={formData.packageType}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, packageType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select package type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="food">Food Items</SelectItem>
                        <SelectItem value="fragile">Fragile Items</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-weight">Weight (kg)</Label>
                    <Input
                      id="package-weight"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.weight}
                      placeholder="2.5"
                      required
                      onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="package-length">Length (cm)</Label>
                    <Input
                      id="package-length"
                      type="number"
                      min="0"
                      value={formData.length}
                      placeholder="30"
                      onChange={(e) => setFormData((prev) => ({ ...prev, length: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-width">Width (cm)</Label>
                    <Input
                      id="package-width"
                      type="number"
                      min="0"
                      value={formData.width}
                      placeholder="20"
                      onChange={(e) => setFormData((prev) => ({ ...prev, width: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="package-height">Height (cm)</Label>
                    <Input
                      id="package-height"
                      type="number"
                      min="0"
                      value={formData.height}
                      placeholder="10"
                      onChange={(e) => setFormData((prev) => ({ ...prev, height: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package-description">Package Description</Label>
                  <Textarea
                    id="package-description"
                    value={formData.packageDescription}
                    placeholder="Describe the contents of your package..."
                    onChange={(e) => setFormData((prev) => ({ ...prev, packageDescription: e.target.value }))}
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fragile"
                      checked={formData.fragile}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, fragile: Boolean(checked) }))}
                    />
                    <Label htmlFor="fragile">Fragile - Handle with care</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="insurance"
                      checked={formData.insurance}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, insurance: Boolean(checked) }))}
                    />
                    <Label htmlFor="insurance">Add insurance coverage (+R25)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="signature"
                      checked={formData.signature}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, signature: Boolean(checked) }))}
                    />
                    <Label htmlFor="signature">Require signature on delivery (+R10)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Processing Order..." : "Proceed to Payment"}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base delivery fee</span>
                  <span>R120</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Distance surcharge</span>
                  <span>R0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fragile fee</span>
                  <span>{formData.fragile ? "R30" : "R0"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Insurance</span>
                  <span>{formData.insurance ? "R25" : "R0"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Signature required</span>
                  <span>{formData.signature ? "R10" : "R0"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated weight surcharge</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Order total will be calculated when you submit the request.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
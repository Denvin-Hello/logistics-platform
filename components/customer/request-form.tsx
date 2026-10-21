"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { estimatePackage, groupCategories, QUICK_CATEGORY_VALUES } from "@/lib/package-presets"
import { quoteFreight } from "@/lib/freight"
import { CheckCircle2, DollarSign, MapPin, Package, Zap } from "lucide-react"

interface RequestResult {
  orderId: string
  amount: number
  baseAmount: number | null
}

export function RequestForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RequestResult | null>(null)

  const [pickupAddress, setPickupAddress] = useState("")
  const [pickupPhone, setPickupPhone] = useState("")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryName, setDeliveryName] = useState("")
  const [deliveryPhone, setDeliveryPhone] = useState("")
  const [deliveryInstructions, setDeliveryInstructions] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [pickupTime, setPickupTime] = useState("")
  const [packageType, setPackageType] = useState("small_parcel")
  const [quantity, setQuantity] = useState("1")
  const [packageDescription, setPackageDescription] = useState("")
  const [offeredAmount, setOfferedAmount] = useState("")
  const [offerTouched, setOfferTouched] = useState(false)
  const [insurance, setInsurance] = useState(false)
  const [signatureRequired, setSignatureRequired] = useState(false)

  const groups = useMemo(() => groupCategories(), [])

  const quote = useMemo(() => {
    const estimate = estimatePackage(packageType, Number(quantity) || 1)
    return quoteFreight({
      packageType,
      weightKg: estimate.weight,
      lengthCm: estimate.length,
      widthCm: estimate.width,
      heightCm: estimate.height,
      insurance,
      signatureRequired,
    })
  }, [packageType, quantity, insurance, signatureRequired])

  const baseAmount = quote.amount
  const offered = Number(offeredAmount) || 0
  const maxOffer = baseAmount * 5
  const offerValid = !quote.blocked && offered >= baseAmount && offered <= maxOffer

  useEffect(() => {
    if (!offerTouched) setOfferedAmount(String(baseAmount))
  }, [baseAmount, offerTouched])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (offered < baseAmount) {
      setError(`Your offer must be at least R${baseAmount}.`)
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/orders/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          pickupPhone,
          deliveryAddress,
          deliveryName,
          deliveryPhone,
          deliveryInstructions,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined,
          packageType,
          quantity: Number(quantity) || 1,
          packageDescription,
          offeredAmount: offered,
          insurance,
          signatureRequired,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to create your request")
      }
      setResult({
        orderId: data.order.orderId,
        amount: data.order.amount,
        baseAmount: data.order.baseAmount ?? null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your request")
    } finally {
      setIsLoading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Request created</CardTitle>
            <CardDescription>
              Your price was accepted. Providers can now take this delivery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">Order number</p>
              <p className="text-xl font-semibold tracking-wide">{result.orderId}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Agreed price (pay on delivery)</span>
              <span className="font-semibold">R{result.amount}</span>
            </div>
            <div className="flex gap-3">
              <Button asChild className="flex-1">
                <Link href="/customer/orders">View my orders</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1 bg-transparent">
                <Link href="/customer/tracking">Track delivery</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-accent" />
          <h1 className="text-3xl font-bold">Quick Request</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Tell us what you're sending and name your price. We use the average size of each item type, so no
          measurements are needed. You pay when it's delivered.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              {error}
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Route
              </CardTitle>
              <CardDescription>Where do we collect and deliver?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request-pickup-address">Pickup Address</Label>
                <Textarea
                  id="request-pickup-address"
                  value={pickupAddress}
                  placeholder="123 Main Street, Cape Town, 8001"
                  required
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-pickup-phone">Pickup Phone</Label>
                <Input
                  id="request-pickup-phone"
                  type="tel"
                  value={pickupPhone}
                  placeholder="082 123 4567"
                  required
                  onChange={(e) => setPickupPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="request-pickup-date">Pickup Date</Label>
                  <Input
                    id="request-pickup-date"
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-pickup-time">Preferred Time</Label>
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger id="request-pickup-time">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                      <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-delivery-address">Delivery Address</Label>
                <Textarea
                  id="request-delivery-address"
                  value={deliveryAddress}
                  placeholder="456 Oak Avenue, Stellenbosch, 7600"
                  required
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="request-delivery-name">Recipient Name</Label>
                  <Input
                    id="request-delivery-name"
                    value={deliveryName}
                    placeholder="Jane Doe"
                    required
                    onChange={(e) => setDeliveryName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-delivery-phone">Recipient Phone</Label>
                  <Input
                    id="request-delivery-phone"
                    type="tel"
                    value={deliveryPhone}
                    placeholder="082 765 4321"
                    required
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-instructions">Delivery Notes (optional)</Label>
                <Textarea
                  id="request-instructions"
                  value={deliveryInstructions}
                  placeholder="Gate code, reception hours, fragile items..."
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-accent" />
                What are you sending?
              </CardTitle>
              <CardDescription>Pick the closest item type — we'll estimate its average size.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="request-package-type">Item Type</Label>
                  <Select value={packageType} onValueChange={setPackageType}>
                    <SelectTrigger id="request-package-type">
                      <SelectValue placeholder="Choose item type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {groups.map(({ group, categories }) => (
                        <div key={group}>
                          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {group}
                          </div>
                          {categories
                            .filter((c) => QUICK_CATEGORY_VALUES.includes(c.value))
                            .map((c) => (
                              <SelectItem key={c.value} value={c.value} title={`${c.description} — e.g. ${c.examples}`}>
                                {c.label}
                              </SelectItem>
                            ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-quantity">Quantity</Label>
                  <Input
                    id="request-quantity"
                    type="number"
                    min={1}
                    max={50}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-description">Description (optional)</Label>
                <Textarea
                  id="request-description"
                  value={packageDescription}
                  placeholder="Anything the driver should know about the contents"
                  onChange={(e) => setPackageDescription(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="request-insurance"
                    checked={insurance}
                    onCheckedChange={(checked) => setInsurance(Boolean(checked))}
                  />
                  <Label htmlFor="request-insurance">Add insurance coverage (+R25)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="request-signature"
                    checked={signatureRequired}
                    onCheckedChange={(checked) => setSignatureRequired(Boolean(checked))}
                  />
                  <Label htmlFor="request-signature">Require signature on delivery (+R10)</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Your Price
              </CardTitle>
              <CardDescription>
                The minimum for this item is R{baseAmount}. Offer more to attract providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="request-offer">Offer (R)</Label>
                <Input
                  id="request-offer"
                  type="number"
                  min={baseAmount}
                  max={maxOffer}
                  step="1"
                  value={offeredAmount}
                  onFocus={() => setOfferTouched(true)}
                  onChange={(e) => setOfferedAmount(e.target.value)}
                />
                {!offerValid ? (
                  <p className="text-sm text-destructive">
                    Enter between R{baseAmount} and R{maxOffer}.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">You'll pay R{offered} on delivery.</p>
                )}
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading || !offerValid || quote.blocked}>
                {quote.blocked
                  ? "Restricted item — contact support"
                  : isLoading
                    ? "Creating request..."
                    : `Request Delivery for R${offered || baseAmount}`}
              </Button>
            </CardContent>
          </Card>
        </form>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Estimate</CardTitle>
              <CardDescription>Based on the average {quote.category.label.toLowerCase()}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average weight</span>
                <span>{quote.actualKg.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vehicle needed</span>
                <span className="font-semibold">{quote.vehicle.label}</span>
              </div>
              <div className="space-y-2 border-t pt-3">
                {quote.breakdown.map((line) => (
                  <div key={line.label} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">{line.label}</span>
                    <span>R{line.amount}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                <span>Minimum price</span>
                <span>R{baseAmount}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Pay cash or card when the delivery arrives. Prices are based on average item sizes, not exact
                measurements.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

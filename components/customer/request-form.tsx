"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackageTypePicker } from "@/components/customer/package-type-picker"
import {
  catalogItemEstimate,
  CUSTOM_ITEM_KEY,
  getCatalogItem,
  type CatalogItem,
} from "@/lib/package-catalog"
import { formatRands } from "@/lib/format"
import { CheckCircle2, Clock, DollarSign, Loader2, MapPin, Package, Zap } from "lucide-react"

interface RequestResult {
  orderId: string
  amount: number
  baseAmount: number | null
}

interface QuoteResult {
  id: string
  status: string
  expiresAt: string
  distanceKm: number
  chargeableWeightKg: number
  baseFare: number
  distanceFare: number
  weightFare: number
  subtotal: number
  total: number
  minimumApplied: boolean
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

export function RequestForm() {
  const [isQuoting, setIsQuoting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
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
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [packageDescription, setPackageDescription] = useState("")
  const [offeredAmount, setOfferedAmount] = useState("")
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [clock, setClock] = useState(() => Date.now())

  const selectedCatalogItems = selectedItems
    .map((itemKey) => getCatalogItem(itemKey))
    .filter((item): item is CatalogItem => !!item)
  const totalQuantity = selectedCatalogItems.reduce(
    (sum, item) => sum + (Number(quantities[item.value]) || 1),
    0,
  )
  const estimatedWeight = selectedCatalogItems.reduce(
    (sum, item) =>
      sum + catalogItemEstimate(item, Math.max(1, Number(quantities[item.value]) || 1)).weight,
    0,
  )

  useEffect(() => {
    if (!quote) return
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [quote])

  const remainingSeconds = quote
    ? Math.floor((new Date(quote.expiresAt).getTime() - clock) / 1000)
    : 0
  const quoteExpired = !!quote && remainingSeconds <= 0

  const baseAmount = quote?.total ?? 0
  const offered = Number(offeredAmount) || 0
  const maxOffer = baseAmount * 5
  const offerValid = !!quote && !quoteExpired && offered >= baseAmount && offered <= maxOffer

  function invalidateQuote() {
    setQuote(null)
    setOfferedAmount("")
    setError(null)
  }

  function changeItems(itemKeys: string[]) {
    setSelectedItems(itemKeys)
    setQuantities((prev) =>
      Object.fromEntries(itemKeys.map((itemKey) => [itemKey, prev[itemKey] ?? "1"])),
    )
    invalidateQuote()
  }

  function updateQuantity(itemKey: string, quantity: string) {
    setQuantities((prev) => ({ ...prev, [itemKey]: quantity }))
    invalidateQuote()
  }

  async function handleQuote(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (selectedItems.length === 0) {
      setError("Choose at least one item to send.")
      return
    }

    if (selectedItems.includes(CUSTOM_ITEM_KEY) && !packageDescription.trim()) {
      setError("Describe the custom item so providers know what to collect.")
      return
    }

    setIsQuoting(true)
    setQuote(null)

    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "QUICK",
          pickupAddress,
          pickupPhone,
          deliveryAddress,
          deliveryName,
          deliveryPhone,
          deliveryInstructions,
          pickupDate: pickupDate || undefined,
          pickupTime: pickupTime || undefined,
          quick: {
            items: selectedItems.map((itemKey) => ({
              itemKey,
              quantity: Number(quantities[itemKey]) || 1,
              description: itemKey === CUSTOM_ITEM_KEY ? packageDescription : "",
            })),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to calculate a quote.")
      }

      setQuote(data.quote)
      setClock(Date.now())
      setOfferedAmount(String(data.quote.total))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to calculate a quote.")
    } finally {
      setIsQuoting(false)
    }
  }

  async function handleConfirm() {
    if (!quote) return
    setError(null)

    if (!offerValid) {
      setError(`Your offer must be between ${formatRands(baseAmount)} and ${formatRands(maxOffer)}.`)
      return
    }

    setIsConfirming(true)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeredAmount: offered }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        if (res.status === 410) setQuote(null)
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
      setIsConfirming(false)
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
              <span className="font-semibold">{formatRands(result.amount)}</span>
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
        <form onSubmit={handleQuote} className="lg:col-span-2 space-y-6">
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
                  onChange={(e) => {
                    setPickupAddress(e.target.value)
                    invalidateQuote()
                  }}
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
                  onChange={(e) => {
                    setPickupPhone(e.target.value)
                    invalidateQuote()
                  }}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="request-pickup-date">Pickup Date</Label>
                  <Input
                    id="request-pickup-date"
                    type="date"
                    value={pickupDate}
                    onChange={(e) => {
                      setPickupDate(e.target.value)
                      invalidateQuote()
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-pickup-time">Preferred Time</Label>
                  <Select
                    value={pickupTime}
                    onValueChange={(value) => {
                      setPickupTime(value)
                      invalidateQuote()
                    }}
                  >
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
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value)
                    invalidateQuote()
                  }}
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
                    onChange={(e) => {
                      setDeliveryName(e.target.value)
                      invalidateQuote()
                    }}
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
                    onChange={(e) => {
                      setDeliveryPhone(e.target.value)
                      invalidateQuote()
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-instructions">Delivery Notes (optional)</Label>
                <Textarea
                  id="request-instructions"
                  value={deliveryInstructions}
                  placeholder="Gate code, reception hours, fragile items..."
                  onChange={(e) => {
                    setDeliveryInstructions(e.target.value)
                    invalidateQuote()
                  }}
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
              <CardDescription>
                Pick one or more items and quantities — we'll estimate their average size and weight.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PackageTypePicker
                value={selectedItems}
                onChange={changeItems}
                idPrefix="request-package"
              />

              {selectedCatalogItems.map((item) => (
                <div key={item.value} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.categoryLabel} &gt; {item.subcategoryLabel}
                    </p>
                  </div>
                  <div className="w-24 shrink-0 space-y-1">
                    <Label htmlFor={`request-quantity-${item.value}`} className="text-xs">
                      Quantity
                    </Label>
                    <Input
                      id={`request-quantity-${item.value}`}
                      type="number"
                      min={1}
                      max={50}
                      value={quantities[item.value] ?? "1"}
                      onChange={(e) => updateQuantity(item.value, e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="request-description">Description (optional)</Label>
                <Textarea
                  id="request-description"
                  value={packageDescription}
                  placeholder="Anything the driver should know about the contents"
                  onChange={(e) => setPackageDescription(e.target.value)}
                />
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
                {quote
                  ? `The minimum for this delivery is ${formatRands(baseAmount)}. Offer more to attract providers.`
                  : "Get a quote to see the minimum price for this delivery."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="request-offer">Offer (R)</Label>
                    <Input
                      id="request-offer"
                      type="number"
                      min={baseAmount}
                      max={maxOffer}
                      step="1"
                      value={offeredAmount}
                      onChange={(e) => setOfferedAmount(e.target.value)}
                    />
                    {!offerValid ? (
                      <p className="text-sm text-destructive">
                        {quoteExpired
                          ? "This quote has expired. Request a fresh quote."
                          : `Enter between ${formatRands(baseAmount)} and ${formatRands(maxOffer)}.`}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        You'll pay {formatRands(offered)} on delivery.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={isConfirming || !offerValid}
                    onClick={handleConfirm}
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating request...
                      </>
                    ) : (
                      `Request Delivery for ${formatRands(offered || baseAmount)}`
                    )}
                  </Button>
                </>
              ) : (
                <Button type="submit" className="w-full" size="lg" disabled={isQuoting}>
                  {isQuoting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calculating road distance...
                    </>
                  ) : (
                    "Get delivery quote"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </form>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>{quote ? "Your quote" : "Estimate"}</CardTitle>
              <CardDescription>
                Based on average item sizes{selectedCatalogItems.length ? ` for ${selectedCatalogItems.length} item type${selectedCatalogItems.length === 1 ? "" : "s"}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average weight</span>
                <span>{estimatedWeight.toFixed(1)} kg</span>
              </div>
              {quote ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Road distance</span>
                    <span>{quote.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Chargeable weight</span>
                    <span>{quote.chargeableWeightKg.toFixed(1)} kg</span>
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base fare</span>
                      <span>{formatRands(quote.baseFare)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Distance fare</span>
                      <span>{formatRands(quote.distanceFare)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Weight charge</span>
                      <span>{formatRands(quote.weightFare)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-3 text-sm font-semibold">
                    <span>Minimum price</span>
                    <span>{formatRands(baseAmount)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {quoteExpired ? (
                      <span className="text-destructive">Quote expired.</span>
                    ) : (
                      <span>Expires in {formatCountdown(remainingSeconds)}</span>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Prices are based on road distance and average item sizes, not exact measurements.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Pay cash or card when the delivery arrives.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PackageTypePicker } from "@/components/customer/package-type-picker"
import {
  catalogItemPath,
  CUSTOM_ITEM_KEY,
  getCatalogItem,
  isCatalogItemBlocked,
  type CatalogItem,
} from "@/lib/package-catalog"
import { formatRands } from "@/lib/format"
import {
  MapPin,
  Package,
  DollarSign,
  Truck,
  CheckCircle2,
  Trash2,
  Loader2,
  Clock,
} from "lucide-react"

interface OrderDetails {
  orderId: string
  amount: number
  description: string
}

interface ParcelDraft {
  id: string
  itemKey: string
  itemLabel: string
  catalogCategory: string
  catalogSubcategory: string
  packageType: string
  description: string
  length: string
  width: string
  height: string
  weight: string
  quantity: string
}

interface FormData {
  pickupName: string
  pickupPhone: string
  pickupAddress: string
  pickupDate: string
  pickupTime: string
  deliveryName: string
  deliveryPhone: string
  deliveryAddress: string
  deliveryInstructions: string
  description: string
  parcels: ParcelDraft[]
}

interface QuoteResult {
  id: string
  status: string
  expiresAt: string
  distanceKm: number
  distanceM: number
  chargeableWeightKg: number
  baseFare: number
  distanceFare: number
  weightFare: number
  subtotal: number
  total: number
  minimumApplied: boolean
}

function newParcel(item: CatalogItem, id: string): ParcelDraft {
  return {
    id,
    itemKey: item.value,
    itemLabel: item.label,
    catalogCategory: item.category,
    catalogSubcategory: item.subcategory,
    packageType: item.packageType,
    description: "",
    length: String(item.defaultDimensionsCm.length),
    width: String(item.defaultDimensionsCm.width),
    height: String(item.defaultDimensionsCm.height),
    weight: String(item.defaultWeightKg),
    quantity: "1",
  }
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

export function OrderForm({ initialItemKeys = [] }: { initialItemKeys?: string[] }) {
  const [isQuoting, setIsQuoting] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [clock, setClock] = useState(() => Date.now())
  const startItems = Array.from(
    new Map(
      initialItemKeys
        .map((itemKey) => getCatalogItem(itemKey))
        .filter((item): item is CatalogItem => !!item && !isCatalogItemBlocked(item))
        .map((item) => [item.value, item]),
    ).values(),
  )
  const nextParcelId = useRef(startItems.length + 1)

  const [form, setForm] = useState<FormData>({
    pickupName: "",
    pickupPhone: "",
    pickupAddress: "",
    pickupDate: "",
    pickupTime: "",
    deliveryName: "",
    deliveryPhone: "",
    deliveryAddress: "",
    deliveryInstructions: "",
    description: "",
    parcels: startItems.map((item, index) => newParcel(item, `parcel-${index + 1}`)),
  })

  useEffect(() => {
    if (!quote) return
    const timer = setInterval(() => setClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [quote])

  const remainingSeconds = quote
    ? Math.floor((new Date(quote.expiresAt).getTime() - clock) / 1000)
    : 0
  const quoteExpired = !!quote && remainingSeconds <= 0

  function update(patch: Partial<Omit<FormData, "parcels">>) {
    setForm((prev) => ({ ...prev, ...patch }))
    setQuote(null)
    setError(null)
  }

  function updateParcel(id: string, patch: Partial<ParcelDraft>) {
    setForm((prev) => ({
      ...prev,
      parcels: prev.parcels.map((parcel) => (parcel.id === id ? { ...parcel, ...patch } : parcel)),
    }))
    setQuote(null)
    setError(null)
  }

  function syncSelection(itemKeys: string[]) {
    setForm((prev) => {
      const existing = new Map(prev.parcels.map((parcel) => [parcel.itemKey, parcel]))
      const parcels: ParcelDraft[] = []

      for (const itemKey of itemKeys) {
        const current = existing.get(itemKey)
        if (current) {
          parcels.push(current)
          continue
        }

        const item = getCatalogItem(itemKey)
        if (!item || isCatalogItemBlocked(item)) continue
        const id = `parcel-${nextParcelId.current}`
        nextParcelId.current += 1
        parcels.push(newParcel(item, id))
      }

      return { ...prev, parcels }
    })
    setQuote(null)
    setError(null)
  }

  function removeParcel(id: string) {
    setForm((prev) => ({ ...prev, parcels: prev.parcels.filter((parcel) => parcel.id !== id) }))
    setQuote(null)
  }

  function validateParcels() {
    if (form.parcels.length === 0) {
      throw new Error("Select at least one item to send.")
    }

    return form.parcels.map((parcel, index) => {
      if (parcel.itemKey === CUSTOM_ITEM_KEY && !parcel.description.trim()) {
        throw new Error("Describe the custom item so providers know what to collect.")
      }

      const values = {
        lengthCm: Number(parcel.length),
        widthCm: Number(parcel.width),
        heightCm: Number(parcel.height),
        actualWeightKg: Number(parcel.weight),
        quantity: Number(parcel.quantity),
      }
      if (
        !Number.isFinite(values.lengthCm) ||
        !Number.isFinite(values.widthCm) ||
        !Number.isFinite(values.heightCm) ||
        values.lengthCm <= 0 ||
        values.widthCm <= 0 ||
        values.heightCm <= 0
      ) {
        throw new Error(`Enter length, width and height for parcel ${index + 1}.`)
      }
      if (!Number.isFinite(values.actualWeightKg) || values.actualWeightKg <= 0) {
        throw new Error(`Enter the actual weight for parcel ${index + 1}.`)
      }
      if (!Number.isInteger(values.quantity) || values.quantity < 1 || values.quantity > 50) {
        throw new Error(`Enter a whole-number quantity between 1 and 50 for parcel ${index + 1}.`)
      }
      return {
        packageType: parcel.packageType,
        itemKey: parcel.itemKey,
        itemLabel: parcel.itemLabel,
        catalogCategory: parcel.catalogCategory,
        catalogSubcategory: parcel.catalogSubcategory,
        description: parcel.description,
        ...values,
      }
    })
  }

  async function handleQuote(e: React.FormEvent) {
    e.preventDefault()
    setIsQuoting(true)
    setError(null)
    setQuote(null)

    try {
      const parcels = validateParcels()
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "FORM",
          pickupAddress: form.pickupAddress,
          pickupPhone: form.pickupPhone,
          pickupDate: form.pickupDate,
          pickupTime: form.pickupTime,
          deliveryAddress: form.deliveryAddress,
          deliveryName: form.deliveryName,
          deliveryPhone: form.deliveryPhone,
          deliveryInstructions: form.deliveryInstructions,
          parcels,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to calculate a quote.")
      }

      setQuote(result.quote)
      setClock(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to calculate a quote.")
    } finally {
      setIsQuoting(false)
    }
  }

  async function handleConfirm() {
    if (!quote) return
    setIsConfirming(true)
    setError(null)

    try {
      const response = await fetch(`/api/quotes/${quote.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        if (response.status === 410) setQuote(null)
        throw new Error(result.error || "Unable to create your order.")
      }

      setOrderDetails({
        orderId: result.order.orderId,
        amount: result.order.amount,
        description: result.order.description,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your order.")
    } finally {
      setIsConfirming(false)
    }
  }

  if (orderDetails) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Delivery requested</CardTitle>
            <CardDescription>
              Providers can now accept your delivery. You pay when it arrives.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">Order number</p>
              <p className="text-xl font-semibold tracking-wide">{orderDetails.orderId}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount to pay on delivery</span>
              <span className="font-semibold">{formatRands(orderDetails.amount)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Keep your order number and email address handy — you'll need both to track this delivery.
            </p>
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
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Delivery Order</h1>
        <p className="text-muted-foreground">
          Choose what you're sending, adjust the measurements, get a road-distance quote, then confirm. The
          price is locked until the quote expires.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleQuote} className="space-y-6">
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
                <CardDescription>Where should we collect the parcel?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-name">Contact Name</Label>
                    <Input
                      id="pickup-name"
                      value={form.pickupName}
                      placeholder="John Smith"
                      required
                      onChange={(e) => update({ pickupName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-phone">Phone Number</Label>
                    <Input
                      id="pickup-phone"
                      value={form.pickupPhone}
                      type="tel"
                      placeholder="+27 12 345 6789"
                      required
                      onChange={(e) => update({ pickupPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup-address">Pickup Address</Label>
                  <Textarea
                    id="pickup-address"
                    value={form.pickupAddress}
                    placeholder="123 Main Street, Cape Town, 8001"
                    required
                    onChange={(e) => update({ pickupAddress: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup-date">Pickup Date</Label>
                    <Input
                      id="pickup-date"
                      type="date"
                      value={form.pickupDate}
                      onChange={(e) => update({ pickupDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pickup-time">Preferred Time</Label>
                    <Select value={form.pickupTime} onValueChange={(value) => update({ pickupTime: value })}>
                      <SelectTrigger id="pickup-time">
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
                <CardDescription>Where should we deliver the parcels?</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-name">Recipient Name</Label>
                    <Input
                      id="delivery-name"
                      value={form.deliveryName}
                      placeholder="Jane Doe"
                      required
                      onChange={(e) => update({ deliveryName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery-phone">Phone Number</Label>
                    <Input
                      id="delivery-phone"
                      type="tel"
                      value={form.deliveryPhone}
                      placeholder="+27 12 345 6789"
                      required
                      onChange={(e) => update({ deliveryPhone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-address">Delivery Address</Label>
                  <Textarea
                    id="delivery-address"
                    value={form.deliveryAddress}
                    placeholder="456 Oak Avenue, Stellenbosch, 7600"
                    required
                    onChange={(e) => update({ deliveryAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery-instructions">Special Instructions</Label>
                  <Textarea
                    id="delivery-instructions"
                    value={form.deliveryInstructions}
                    placeholder="Ring doorbell, leave at front door if no answer..."
                    onChange={(e) => update({ deliveryInstructions: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  Parcels
                </CardTitle>
                <CardDescription>
                  Pick one or more items. We prefill typical measurements and weight, which you can adjust.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PackageTypePicker
                  value={form.parcels.map((parcel) => parcel.itemKey)}
                  onChange={syncSelection}
                  idPrefix="order"
                />

                {form.parcels.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Select one or more items above. Each item gets its own measurements and quantity.
                  </div>
                ) : null}

                {form.parcels.map((parcel, index) => {
                  const item = getCatalogItem(parcel.itemKey)
                  return (
                    <div key={parcel.id} className="rounded-2xl border p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {index + 1}. {parcel.itemLabel}
                          </p>
                          {item ? (
                            <p className="text-xs text-muted-foreground">{catalogItemPath(item)}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => removeParcel(parcel.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor={`${parcel.id}-length`}>Length (cm)</Label>
                          <Input
                            id={`${parcel.id}-length`}
                            type="number"
                            min="1"
                            step="0.1"
                            value={parcel.length}
                            onChange={(e) => updateParcel(parcel.id, { length: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${parcel.id}-width`}>Width (cm)</Label>
                          <Input
                            id={`${parcel.id}-width`}
                            type="number"
                            min="1"
                            step="0.1"
                            value={parcel.width}
                            onChange={(e) => updateParcel(parcel.id, { width: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${parcel.id}-height`}>Height (cm)</Label>
                          <Input
                            id={`${parcel.id}-height`}
                            type="number"
                            min="1"
                            step="0.1"
                            value={parcel.height}
                            onChange={(e) => updateParcel(parcel.id, { height: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${parcel.id}-quantity`}>Quantity</Label>
                          <Input
                            id={`${parcel.id}-quantity`}
                            type="number"
                            min="1"
                            max="50"
                            value={parcel.quantity}
                            onChange={(e) => updateParcel(parcel.id, { quantity: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`${parcel.id}-weight`}>Actual weight per item (kg)</Label>
                          <Input
                            id={`${parcel.id}-weight`}
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={parcel.weight}
                            onChange={(e) => updateParcel(parcel.id, { weight: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`${parcel.id}-description`}>
                            {parcel.itemKey === "custom" ? "Describe the item" : "Parcel description (optional)"}
                          </Label>
                          <Input
                            id={`${parcel.id}-description`}
                            value={parcel.description}
                            placeholder={parcel.itemKey === "custom" ? "Tell us what you're sending" : "What's inside?"}
                            onChange={(e) => updateParcel(parcel.id, { description: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="space-y-2">
                  <Label htmlFor="package-description">Delivery notes (optional)</Label>
                  <Textarea
                    id="package-description"
                    value={form.description}
                    placeholder="Anything else the provider should know?"
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" size="lg" disabled={isQuoting}>
              {isQuoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating road distance...
                </>
              ) : quote ? (
                "Get a fresh quote"
              ) : (
                "Get delivery quote"
              )}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-accent" />
                Delivery Quote
              </CardTitle>
              <CardDescription>Road distance, not straight-line distance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote ? (
                <>
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Road distance</span>
                      <span>{quote.distanceKm.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Chargeable weight</span>
                      <span>{quote.chargeableWeightKg.toFixed(1)} kg</span>
                    </div>
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
                    {quote.minimumApplied ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Minimum applied</span>
                        <span>{formatRands(quote.total)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-xl font-bold">{formatRands(quote.total)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {quoteExpired ? (
                      <span className="text-destructive">Quote expired — request a new price.</span>
                    ) : (
                      <span>Expires in {formatCountdown(remainingSeconds)}</span>
                    )}
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={handleConfirm}
                    disabled={isConfirming || quoteExpired}
                  >
                    {isConfirming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating order...
                      </>
                    ) : (
                      `Confirm delivery — ${formatRands(quote.total)}`
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    The order is created from this stored quote. No payment is taken now; you pay on delivery.
                  </p>
                </>
              ) : (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Fill in the route and parcel measurements, then select “Get delivery quote”. We use the
                    road distance and the heavier of actual or volumetric weight.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

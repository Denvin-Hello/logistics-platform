"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PricingConfigValues } from "@/lib/pricing"
import { Loader2, Plus, Trash2 } from "lucide-react"

interface BandRow {
  to: string
  rate: string
}

interface PricingConfigFormProps {
  version: number
  config: PricingConfigValues
}

export function PricingConfigForm({ version, config }: PricingConfigFormProps) {
  const router = useRouter()
  const [baseFare, setBaseFare] = useState(String(config.baseFare))
  const [minimumFare, setMinimumFare] = useState(String(config.minimumFare))
  const [quoteTtlMinutes, setQuoteTtlMinutes] = useState(String(config.quoteTtlMinutes))
  const [volumetricDivisor, setVolumetricDivisor] = useState(String(config.volumetricDivisor))
  const [freeWeightKg, setFreeWeightKg] = useState(String(config.freeWeightKg))
  const [bands, setBands] = useState<BandRow[]>(
    config.distanceBands.map((to, index) => ({
      to: to === null ? "" : String(to),
      rate: String(config.distanceRates[index] ?? 0),
    })),
  )
  const [massBands, setMassBands] = useState<BandRow[]>(
    config.weightBands.map((to, index) => ({
      to: to === null ? "" : String(to),
      rate: String(config.weightRates[index] ?? 0),
    })),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<number | null>(null)

  function updateBand(index: number, patch: Partial<BandRow>) {
    setBands((prev) => prev.map((band, i) => (i === index ? { ...band, ...patch } : band)))
    setSaved(null)
  }

  function addBand() {
    setBands((prev) => {
      const lastClosed = [...prev].reverse().find((band) => band.to !== "")
      const nextBoundary = lastClosed ? Number(lastClosed.to) + 10 : 10
      return [...prev.slice(0, -1), { to: String(nextBoundary), rate: prev[prev.length - 1]?.rate ?? "0" }, prev[prev.length - 1]]
    })
    setSaved(null)
  }

  function removeBand(index: number) {
    if (index === bands.length - 1) return
    setBands((prev) => prev.filter((_, i) => i !== index))
    setSaved(null)
  }

  function updateMassBand(index: number, patch: Partial<BandRow>) {
    setMassBands((prev) => prev.map((band, i) => (i === index ? { ...band, ...patch } : band)))
    setSaved(null)
  }

  function addMassBand() {
    setMassBands((prev) => {
      const lastClosed = [...prev].reverse().find((band) => band.to !== "")
      const nextBoundary = lastClosed ? Number(lastClosed.to) + 10 : 10
      return [
        ...prev.slice(0, -1),
        { to: String(nextBoundary), rate: prev[prev.length - 1]?.rate ?? "0" },
        prev[prev.length - 1],
      ]
    })
    setSaved(null)
  }

  function removeMassBand(index: number) {
    if (index === massBands.length - 1) return
    setMassBands((prev) => prev.filter((_, i) => i !== index))
    setSaved(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    setSaved(null)

    try {
      const payload = {
        baseFare: Number(baseFare),
        minimumFare: Number(minimumFare),
        distanceBands: bands.map((band, index) => (index === bands.length - 1 ? null : Number(band.to))),
        distanceRates: bands.map((band) => Number(band.rate)),
        freeWeightKg: Number(freeWeightKg),
        weightBands: massBands.map((band, index) => (index === massBands.length - 1 ? null : Number(band.to))),
        weightRates: massBands.map((band) => Number(band.rate)),
        volumetricDivisor: Number(volumetricDivisor),
        quoteTtlMinutes: Number(quoteTtlMinutes),
        currency: config.currency,
      }

      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: payload }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to save pricing.")
      }

      setSaved(data.config.version)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save pricing.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Saved pricing version {saved}. New quotes use it immediately; existing quotes keep their snapshot.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Base and minimum</CardTitle>
          <CardDescription>Every quote starts with the base fare and is never below the minimum.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pricing-base">Base fare (R)</Label>
            <Input
              id="pricing-base"
              type="number"
              min="0"
              step="1"
              value={baseFare}
              onChange={(e) => {
                setBaseFare(e.target.value)
                setSaved(null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricing-minimum">Minimum fare (R)</Label>
            <Input
              id="pricing-minimum"
              type="number"
              min="0"
              step="1"
              value={minimumFare}
              onChange={(e) => {
                setMinimumFare(e.target.value)
                setSaved(null)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distance bands</CardTitle>
          <CardDescription>
            Rates apply per kilometre. The last band is open-ended and has no upper limit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium text-muted-foreground">
            <span>Up to (km)</span>
            <span>Rate (R/km)</span>
            <span />
          </div>
          {bands.map((band, index) => {
            const isLast = index === bands.length - 1
            return (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={band.to}
                  placeholder="No limit"
                  disabled={isLast}
                  aria-label={`Band ${index + 1} upper limit`}
                  onChange={(e) => updateBand(index, { to: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={band.rate}
                  aria-label={`Band ${index + 1} rate`}
                  onChange={(e) => updateBand(index, { rate: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isLast}
                  aria-label={`Remove band ${index + 1}`}
                  onClick={() => removeBand(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
          <Button type="button" variant="outline" size="sm" onClick={addBand}>
            <Plus className="h-4 w-4 mr-2" />
            Add distance band
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chargeable mass</CardTitle>
          <CardDescription>
            Charge the heavier of actual or volumetric weight after the free allowance. The last band is
            open-ended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="pricing-free-weight">Free weight per quote (kg)</Label>
            <Input
              id="pricing-free-weight"
              type="number"
              min="0"
              step="0.1"
              value={freeWeightKg}
              onChange={(e) => {
                setFreeWeightKg(e.target.value)
                setSaved(null)
              }}
            />
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium text-muted-foreground">
            <span>Up to (kg)</span>
            <span>Rate (R/kg)</span>
            <span />
          </div>
          {massBands.map((band, index) => {
            const isLast = index === massBands.length - 1
            return (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={band.to}
                  placeholder="No limit"
                  disabled={isLast}
                  aria-label={`Mass band ${index + 1} upper limit`}
                  onChange={(e) => updateMassBand(index, { to: e.target.value })}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={band.rate}
                  aria-label={`Mass band ${index + 1} rate`}
                  onChange={(e) => updateMassBand(index, { rate: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isLast}
                  aria-label={`Remove mass band ${index + 1}`}
                  onClick={() => removeMassBand(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
          <Button type="button" variant="outline" size="sm" onClick={addMassBand}>
            <Plus className="h-4 w-4 mr-2" />
            Add mass band
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quote settings</CardTitle>
          <CardDescription>Validity and how volumetric weight is calculated.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pricing-ttl">Quote validity (minutes)</Label>
            <Input
              id="pricing-ttl"
              type="number"
              min="1"
              max="240"
              step="1"
              value={quoteTtlMinutes}
              onChange={(e) => {
                setQuoteTtlMinutes(e.target.value)
                setSaved(null)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricing-divisor">Volumetric divisor</Label>
            <Input
              id="pricing-divisor"
              type="number"
              min="1"
              step="1"
              value={volumetricDivisor}
              onChange={(e) => {
                setVolumetricDivisor(e.target.value)
                setSaved(null)
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save pricing"
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Current active version: {version}. Saving creates a new immutable version.
      </p>
    </form>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2, MapPin } from "lucide-react"

export interface ProviderProfile {
  businessName: string | null
  phone: string | null
  serviceArea: string | null
  serviceAreaLat: number | null
  serviceAreaLng: number | null
  serviceRadiusKm: number | null
  vehicleType: string | null
  vehicleCapacityKg: number | null
}

export function ProfileForm({ initialProfile }: { initialProfile: ProviderProfile }) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [busy, setBusy] = useState(false)

  const update = <K extends keyof ProviderProfile>(key: K, value: ProviderProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/provider/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: profile.businessName ?? "",
          phone: profile.phone ?? "",
          serviceArea: profile.serviceArea ?? "",
          serviceRadiusKm: profile.serviceRadiusKm ?? 50,
          vehicleType: profile.vehicleType ?? "",
          vehicleCapacityKg: profile.vehicleCapacityKg ?? 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Could not save profile", description: data.error || "Try again." })
        return
      }
      setProfile(data.profile)
      toast({
        title: "Profile updated",
        description: data.geocoded
          ? "Your service area was located and will be used for nearby offers."
          : "Your service area was saved. Add a clearer suburb or city to improve matching.",
      })
      router.refresh()
    } catch {
      toast({ title: "Could not save profile", description: "Unable to reach the server." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
          <CardDescription>How customers and dispatch see your business.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input
              id="businessName"
              value={profile.businessName ?? ""}
              onChange={(event) => update("businessName", event.target.value)}
              maxLength={160}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phone">Contact phone</Label>
            <Input
              id="phone"
              value={profile.phone ?? ""}
              onChange={(event) => update("phone", event.target.value)}
              maxLength={50}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service area</CardTitle>
          <CardDescription>
            We use this city or suburb, plus your radius, to match nearby delivery offers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="serviceArea">City or suburb</Label>
            <Input
              id="serviceArea"
              placeholder="e.g. Cape Town CBD"
              value={profile.serviceArea ?? ""}
              onChange={(event) => update("serviceArea", event.target.value)}
              maxLength={160}
            />
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {profile.serviceAreaLat != null && profile.serviceAreaLng != null
                ? "Location saved for distance-based matching."
                : "Save a recognisable city or suburb to enable distance matching."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serviceRadiusKm">Radius (km)</Label>
            <Input
              id="serviceRadiusKm"
              type="number"
              min={1}
              max={500}
              value={profile.serviceRadiusKm ?? 50}
              onChange={(event) => update("serviceRadiusKm", Number(event.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle</CardTitle>
          <CardDescription>Offers are limited to loads your vehicle can carry.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicleType">Vehicle type</Label>
            <Input
              id="vehicleType"
              placeholder="e.g. 1T van"
              value={profile.vehicleType ?? ""}
              onChange={(event) => update("vehicleType", event.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicleCapacityKg">Capacity (kg)</Label>
            <Input
              id="vehicleCapacityKg"
              type="number"
              min={0}
              max={50000}
              value={profile.vehicleCapacityKg ?? 0}
              onChange={(event) => update("vehicleCapacityKg", Number(event.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  )
}

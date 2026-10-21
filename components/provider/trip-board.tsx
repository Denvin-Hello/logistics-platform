"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TripMap } from "@/components/provider/trip-map"
import { toast } from "@/hooks/use-toast"
import { formatDateTime, formatRands, formatTime } from "@/lib/format"
import { formatDistance, haversineDistanceM, type GeoPoint } from "@/lib/geo"
import type { RouteResult } from "@/lib/routing"
import { ORDER_STATUS } from "@/lib/order-status"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react"

interface TripOrder {
  id: string
  orderNumber: string
  customerName: string
  pickupAddress: string
  pickupPhone: string
  pickupDate: string | null
  pickupTime: string | null
  deliveryAddress: string
  deliveryName: string
  deliveryPhone: string
  deliveryInstructions: string
  packageType: string
  amount: number
  status: string
  startedAt: string | null
}

interface TripBoardProps {
  order: TripOrder
  pickup: GeoPoint | null
  delivery: GeoPoint | null
  route: RouteResult | null
  radiusM: number
  maxAccuracyM: number
}

interface LivePosition {
  lat: number
  lng: number
  accuracy: number
}

export function TripBoard({ order, pickup, delivery, route, radiusM, maxAccuracyM }: TripBoardProps) {
  const router = useRouter()
  const [status, setStatus] = useState(order.status)
  const [startedAt, setStartedAt] = useState(order.startedAt)
  const [position, setPosition] = useState<LivePosition | null>(null)
  const [gpsActive, setGpsActive] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastSent, setLastSent] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const sendLocation = useCallback(
    async (lat: number, lng: number, accuracy: number) => {
      try {
        const res = await fetch("/api/tracking/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, lat, lng, accuracy }),
        })
        if (res.ok) {
          lastSentRef.current = Date.now()
          setLastSent(formatTime(new Date()))
        }
      } catch {
        // Transient failures retry on the next GPS update.
      }
    },
    [order.id],
  )

  const startWatching = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGpsError("This browser does not support GPS. Dispatch must complete this delivery.")
      return
    }

    clearWatch()
    setGpsError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }
        setPosition(next)
        setGpsActive(true)
        if (Date.now() - lastSentRef.current >= 8000) {
          void sendLocation(next.lat, next.lng, next.accuracy)
        }
      },
      (err) => {
        setGpsActive(false)
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access or ask dispatch to complete the delivery."
            : `GPS unavailable: ${err.message}`,
        )
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    )
    setGpsActive(true)
  }, [clearWatch, sendLocation])

  useEffect(() => {
    if (status !== ORDER_STATUS.IN_TRANSIT) {
      clearWatch()
      return
    }

    startWatching()
    return clearWatch
  }, [status, startWatching, clearWatch])

  const distanceM = position && delivery ? haversineDistanceM(position, delivery) : null
  const accuracyOk = position != null && position.accuracy <= maxAccuracyM
  const withinRadius = distanceM != null && distanceM <= radiusM
  const canEnd = status === ORDER_STATUS.IN_TRANSIT && position != null && accuracyOk && withinRadius && !busy

  const blockedReason = (() => {
    if (status === ORDER_STATUS.ASSIGNED) return "Start the trip to begin GPS tracking."
    if (!delivery) return "Destination could not be located. Dispatch must complete this delivery."
    if (!position) return gpsError || "Waiting for your GPS position..."
    if (!accuracyOk) {
      return `GPS accuracy is ${formatDistance(position.accuracy)}; it must be ${maxAccuracyM} m or better.`
    }
    if (!withinRadius && distanceM != null) {
      return `You are ${formatDistance(distanceM)} from the destination. Get within ${formatDistance(radiusM)} to end the trip.`
    }
    return null
  })()

  async function startTrip() {
    setBusy(true)
    try {
      const res = await fetch(`/api/provider/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Could not start trip", description: data.error || "Try again.", variant: "destructive" })
        return
      }
      setStatus(ORDER_STATUS.IN_TRANSIT)
      setStartedAt(new Date().toISOString())
      toast({ title: "Trip started", description: "Location sharing is now active." })
    } catch {
      toast({ title: "Could not start trip", description: "Check your connection and try again.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  async function endTrip() {
    if (!position) {
      toast({ title: "Location required", description: "Turn on GPS before ending the trip.", variant: "destructive" })
      return
    }
    if (!accuracyOk) {
      toast({
        title: "GPS accuracy too low",
        description: `Move to an open area and wait for accuracy of ${maxAccuracyM} m or better.`,
        variant: "destructive",
      })
      return
    }
    if (!withinRadius) {
      toast({
        title: "Not at the destination yet",
        description: blockedReason || "Move closer to the delivery address.",
        variant: "destructive",
      })
      return
    }

    setBusy(true)
    try {
      const res = await fetch(`/api/provider/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deliver",
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Could not end trip", description: data.error || "Try again.", variant: "destructive" })
        return
      }
      clearWatch()
      toast({
        title: "Trip completed",
        description: `${order.orderNumber} delivered ${formatDistance(Number(data.distanceM ?? distanceM ?? 0))} from the pin.`,
      })
      router.push("/provider/deliveries")
      router.refresh()
    } catch {
      toast({ title: "Could not end trip", description: "Check your connection and try again.", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/provider/deliveries">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Deliveries
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Trip {order.orderNumber}</h1>
          <p className="text-muted-foreground">
            {order.pickupAddress} → {order.deliveryAddress}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardContent className="p-3">
            <TripMap
              pickup={pickup}
              delivery={delivery}
              route={route}
              driver={position}
              radiusM={radiusM}
            />
            <div className="flex flex-wrap items-center gap-3 px-3 pt-3 text-sm">
              <Badge variant="outline">
                <Navigation className="h-3 w-3 mr-1" />
                {route
                  ? `${formatDistance(route.distanceM)} · ~${Math.max(1, Math.round(route.durationS / 60))} min`
                  : "Route unavailable"}
              </Badge>
              {route?.isFallback ? (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  Approximate route
                </Badge>
              ) : null}
              {delivery ? (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.lat},${delivery.lng}&travelmode=driving`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open navigation
                  </a>
                </Button>
              ) : null}
            </div>
            {!pickup || !delivery ? (
              <p className="px-3 pt-2 text-xs text-amber-600">
                Some addresses could not be located, so the road route is unavailable. Dispatch can complete the
                delivery if the destination pin is missing.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crosshair className="h-5 w-5 text-accent" />
                Arrival check
              </CardTitle>
              <CardDescription>End Trip unlocks within {formatDistance(radiusM)} of the destination.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                {gpsActive && position ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    GPS active
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Waiting for GPS
                  </Badge>
                )}
                {position ? <span className="text-xs text-muted-foreground">±{position.accuracy} m</span> : null}
              </div>

              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Distance to destination</p>
                <p className="text-3xl font-bold">{distanceM != null ? formatDistance(distanceM) : "—"}</p>
                {lastSent ? <p className="text-xs text-muted-foreground mt-1">Location sent {lastSent}</p> : null}
              </div>

              {gpsError ? <p className="text-sm text-amber-600">{gpsError}</p> : null}

              {status === ORDER_STATUS.IN_TRANSIT && !gpsActive ? (
                <Button variant="outline" className="w-full" onClick={startWatching}>
                  <Crosshair className="h-4 w-4 mr-2" />
                  Retry location
                </Button>
              ) : null}

              {status === ORDER_STATUS.ASSIGNED ? (
                <Button className="w-full" disabled={busy} onClick={() => void startTrip()}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Start Trip
                </Button>
              ) : (
                <Button className="w-full" disabled={!canEnd} onClick={() => void endTrip()}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  End Trip
                </Button>
              )}

              {status === ORDER_STATUS.IN_TRANSIT && blockedReason ? (
                <p className="text-xs text-muted-foreground">{blockedReason}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trip details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Pickup</p>
                  <p className="text-muted-foreground">{order.pickupAddress}</p>
                  <p className="text-muted-foreground">{order.pickupPhone}</p>
                  {order.pickupDate ? (
                    <p className="text-muted-foreground">
                      {order.pickupDate} {order.pickupTime ? `at ${order.pickupTime}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium">Delivery</p>
                  <p className="text-muted-foreground">{order.deliveryAddress}</p>
                  <p className="text-muted-foreground">
                    {order.deliveryName} · {order.deliveryPhone}
                  </p>
                  {order.deliveryInstructions ? (
                    <p className="text-muted-foreground">Instructions: {order.deliveryInstructions}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Started {startedAt ? formatDateTime(startedAt) : "when you press Start Trip"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{order.packageType}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-muted p-4">
                <span className="font-medium">Delivery value</span>
                <span className="font-semibold">{formatRands(order.amount)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

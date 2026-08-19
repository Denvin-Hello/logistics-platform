"use client"

import { useEffect, useRef, useState } from "react"
import type * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crosshair, MapPin, Play, Square } from "lucide-react"

const JOBURG: [number, number] = [-26.2041, 28.0473]

interface ActiveOrder {
  id: string
  orderNumber: string
  deliveryAddress: string
  pickupAddress: string
  status: string
}

const selfIcon = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid white">📍</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const destIcon = (L: typeof import("leaflet"), color: string, glyph: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid white">${glyph}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: "application/json" } },
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export function LiveTrackingPanel({ orders }: { orders: ActiveOrder[] }) {
  const [selectedId, setSelectedId] = useState<string>(orders[0]?.id ?? "")
  const [sharing, setSharing] = useState(false)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSent, setLastSent] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const selfMarkerRef = useRef<L.Marker | null>(null)
  const destMarkerRef = useRef<L.Marker | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)

  const selectedOrder = orders.find((o) => o.id === selectedId)

  async function sendLocation(orderId: string, lat: number, lng: number) {
    try {
      const res = await fetch("/api/tracking/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, lat, lng }),
      })
      if (res.ok) {
        lastSentRef.current = Date.now()
        setLastSent(new Date().toLocaleTimeString())
      }
    } catch {
      // ignore transient failures; next update will retry
    }
  }

  function startSharing() {
    if (!selectedId) {
      setError("Select an order to track first.")
      return
    }
    setError(null)

    if (!("geolocation" in navigator)) {
      setError("This browser does not support GPS sharing.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (first) => {
        sendLocation(selectedId, first.coords.latitude, first.coords.longitude)
        setPosition({ lat: first.coords.latitude, lng: first.coords.longitude })
      },
      (err) => setError(`Could not get GPS position: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10_000 },
    )

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setPosition({ lat: latitude, lng: longitude })
        if (Date.now() - lastSentRef.current >= 5000) {
          sendLocation(selectedId, latitude, longitude)
        }
      },
      (err) => setError(`GPS lost: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
    )

    setSharing(true)
  }

  function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setSharing(false)
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let disposed = false

    async function initMap() {
      const L = (await import("leaflet")).default
      if (disposed || !containerRef.current || mapRef.current) return

      leafletRef.current = L
      mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView(JOBURG, 11)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current)
    }

    void initMap()

    return () => {
      disposed = true
    }
  }, [])

  useEffect(() => {
    if (!position || !mapRef.current || !leafletRef.current) return
    const L = leafletRef.current

    if (!selfMarkerRef.current) {
      selfMarkerRef.current = L.marker([position.lat, position.lng], { icon: selfIcon(L) })
        .bindPopup("Your current position")
        .addTo(mapRef.current)
    } else {
      selfMarkerRef.current.setLatLng([position.lat, position.lng])
    }
  }, [position])

  useEffect(() => {
    let cancelled = false

    async function placeDestination() {
      const L = leafletRef.current
      if (!L || !mapRef.current || !selectedOrder) return

      if (destMarkerRef.current) {
        destMarkerRef.current.remove()
        destMarkerRef.current = null
      }

      const point = await geocode(selectedOrder.deliveryAddress)
      if (cancelled || !mapRef.current || !L) return

      if (point) {
        destMarkerRef.current = L.marker([point.lat, point.lng], { icon: destIcon(L, "#dc2626", "🏠") })
          .bindPopup(`Delivery<br/>${selectedOrder.deliveryAddress}`)
          .addTo(mapRef.current)
      }
    }

    void placeDestination()

    return () => {
      cancelled = true
    }
  }, [selectedId, selectedOrder])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-accent" />
              Share Location
            </CardTitle>
            <CardDescription>Pick an active delivery and start broadcasting your GPS position.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active deliveries right now. Accept a delivery to start live tracking.
              </p>
            ) : (
              <>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  disabled={sharing}
                  aria-label="Select order to track"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} ({o.status.replace("_", " ")})
                    </option>
                  ))}
                </select>

                {sharing ? (
                  <Button className="w-full" variant="destructive" onClick={stopSharing}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop Sharing
                  </Button>
                ) : (
                  <Button className="w-full" onClick={startSharing}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Sharing
                  </Button>
                )}

                {sharing && position ? (
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        Sharing
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                    </p>
                    {lastSent ? <p className="text-xs text-muted-foreground">Last sent: {lastSent}</p> : null}
                  </div>
                ) : null}

                {error ? <p className="text-sm text-red-500">{error}</p> : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Order:</span>
              <p className="text-muted-foreground">{selectedOrder?.orderNumber ?? "—"}</p>
            </div>
            <div>
              <span className="font-medium">To:</span>
              <p className="text-muted-foreground">{selectedOrder?.deliveryAddress ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:col-span-2">
        <CardContent className="p-0">
          <div ref={containerRef} className="h-[480px] w-full z-0" />
        </CardContent>
      </Card>
    </div>
  )
}
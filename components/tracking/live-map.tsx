"use client"

import { useEffect, useRef, useState } from "react"
import type * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Navigation, Clock, Satellite } from "lucide-react"

const JOBURG: [number, number] = [-26.2041, 28.0473]

const truckIcon = (L: typeof import("leaflet"), color = "#2563eb") =>
  L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid white">🚚</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })

const pinIcon = (L: typeof import("leaflet"), color: string, glyph: string) =>
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

interface DriverLocation {
  lat: number
  lng: number
  updatedAt: string | null
}

interface TrackingData {
  status: string
  pickupAddress: string
  deliveryAddress: string
  liveTracking?: {
    driverLocation: DriverLocation | null
    pickupAddress: string
    deliveryAddress: string
    estimatedArrival: string
    driverInfo: { name: string; phone: string; vehicle: string }
  }
}

export function LiveMap({ trackingNumber }: { trackingNumber: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const truckMarkerRef = useRef<L.Marker | null>(null)
  const pickupMarkerRef = useRef<L.Marker | null>(null)
  const deliveryMarkerRef = useRef<L.Marker | null>(null)
  const boundsRef = useRef<L.LatLng[]>([])
  const [data, setData] = useState<TrackingData | null>(null)
  const [driver, setDriver] = useState<DriverLocation | null>(null)
  const [geocodeNote, setGeocodeNote] = useState<string | null>(null)

  useEffect(() => {
    let disposed = false
    let map: L.Map | null = null

    async function initMap() {
      const L = (await import("leaflet")).default
      if (disposed || !containerRef.current) return

      leafletRef.current = L
      map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(JOBURG, 11)
      mapRef.current = map

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)
    }

    void initMap()

    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      truckMarkerRef.current = null
      leafletRef.current = null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const res = await fetch(`/api/tracking/${encodeURIComponent(trackingNumber)}`)
        if (res.ok) {
          const json: TrackingData = await res.json()
          if (cancelled) return
          setData(json)

          const loc = json.liveTracking?.driverLocation ?? null
          setDriver(loc)

          const L = (await import("leaflet")).default
          if (!mapRef.current || !loc) return

          if (!truckMarkerRef.current) {
            truckMarkerRef.current = L.marker([loc.lat, loc.lng], { icon: truckIcon(L) })
              .bindPopup(`<b>Driver position</b><br/>Updated ${loc.updatedAt ? new Date(loc.updatedAt).toLocaleTimeString() : "just now"}`)
              .addTo(mapRef.current)
          } else {
            truckMarkerRef.current.setLatLng([loc.lat, loc.lng])
          }

          boundsRef.current.push(L.latLng(loc.lat, loc.lng))
        }
      } catch {
        // ignore transient errors
      }
    }

    void poll()
    timeoutId = setInterval(poll, 10_000)

    return () => {
      cancelled = true
      if (timeoutId) clearInterval(timeoutId)
    }
  }, [trackingNumber])

  useEffect(() => {
    async function placeMarkers() {
      const L = (await import("leaflet")).default
      if (!mapRef.current) return
      let added = false
      let attempted = 0

      const targets: { ref: { current: L.Marker | null }; label: string; value: string; color: string; glyph: string }[] = [
        { ref: pickupMarkerRef, label: "Pickup", value: data?.pickupAddress ?? data?.liveTracking?.pickupAddress ?? "", color: "#16a34a", glyph: "📦" },
        { ref: deliveryMarkerRef, label: "Delivery", value: data?.deliveryAddress ?? data?.liveTracking?.deliveryAddress ?? "", color: "#dc2626", glyph: "🏠" },
      ]

      for (const { ref, label, value, color, glyph } of targets) {
        if (!value) continue
        attempted++
        if (ref.current) {
          ref.current.remove()
          ref.current = null
        }
        const point = await geocode(value)
        if (point && mapRef.current) {
          const marker = L.marker([point.lat, point.lng], { icon: pinIcon(L, color, glyph) })
          marker.bindPopup(`<b>${label}</b><br/>${value}`)
          marker.addTo(mapRef.current)
          ref.current = marker
          boundsRef.current.push(L.latLng(point.lat, point.lng))
          added = true
        }
      }

      if (attempted > 0 && !added) {
        setGeocodeNote("Could not place pickup/delivery on the map. The driver marker still updates live.")
      }
    }

    void placeMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.pickupAddress, data?.deliveryAddress, data?.liveTracking?.pickupAddress, data?.liveTracking?.deliveryAddress])

  useEffect(() => {
    if (boundsRef.current.length >= 2 && leafletRef.current && mapRef.current) {
      mapRef.current.fitBounds(leafletRef.current.latLngBounds(boundsRef.current).pad(0.3))
    }
  }, [driver])

  const liveInfo = data?.liveTracking

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-accent" />
                Live Tracking - #{trackingNumber}
              </CardTitle>
              <CardDescription>Driver location updates every few seconds</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div ref={containerRef} className="h-96 w-full z-0" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <Truck className="h-3 w-3 mr-1" />
                  {data?.status ?? "Loading..."}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Driver GPS:</span>
                </div>
                {driver ? (
                  <>
                    <p className="text-sm text-muted-foreground pl-6">
                      {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                    </p>
                    <p className="text-xs text-muted-foreground pl-6">
                      Last update: {driver.updatedAt ? new Date(driver.updatedAt).toLocaleTimeString() : "just now"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">Waiting for driver to share location...</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Estimated Arrival:</span>
                </div>
                <p className="text-sm font-medium pl-6">{liveInfo?.estimatedArrival ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Driver Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">Name:</span>
                <p className="text-sm text-muted-foreground">{liveInfo?.driverInfo.name ?? "—"}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Phone:</span>
                <p className="text-sm text-muted-foreground">{liveInfo?.driverInfo.phone ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">From:</span>
                <p className="text-sm text-muted-foreground">{liveInfo?.pickupAddress ?? data?.pickupAddress ?? "—"}</p>
              </div>
              <div>
                <span className="text-sm font-medium">To:</span>
                <p className="text-sm text-muted-foreground">{liveInfo?.deliveryAddress ?? data?.deliveryAddress ?? "—"}</p>
              </div>
              {geocodeNote ? <p className="text-xs text-yellow-600">{geocodeNote}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
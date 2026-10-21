"use client"

import { useEffect, useRef, useState } from "react"
import type * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Navigation, Clock, Satellite } from "lucide-react"
import { formatDistance } from "@/lib/geo"
import { formatTime } from "@/lib/format"

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
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") return null
    return { lat: data.lat, lng: data.lng }
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
  statusKey: string
  pickupAddress: string
  deliveryAddress: string
  coordinates?: {
    pickup: { lat: number; lng: number } | null
    delivery: { lat: number; lng: number } | null
  }
  route?: {
    geometry: [number, number][]
    distanceM: number
    durationS: number
    isFallback: boolean
  } | null
  liveTracking?: {
    driverLocation: DriverLocation | null
    pickupAddress: string
    deliveryAddress: string
    estimatedArrival: string
    driverInfo: { name: string; phone: string; vehicle: string }
  }
}

export function LiveMap({ trackingNumber, email }: { trackingNumber: string; email: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const truckMarkerRef = useRef<L.Marker | null>(null)
  const pickupMarkerRef = useRef<L.Marker | null>(null)
  const deliveryMarkerRef = useRef<L.Marker | null>(null)
  const routeLineRef = useRef<L.Polyline | null>(null)
  const boundsRef = useRef<L.LatLng[]>([])
  const [data, setData] = useState<TrackingData | null>(null)
  const [driver, setDriver] = useState<DriverLocation | null>(null)
  const [geocodeNote, setGeocodeNote] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

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
      setMapReady(true)
    }

    void initMap()

    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      truckMarkerRef.current = null
      routeLineRef.current = null
      leafletRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      try {
        const res = await fetch(
          `/api/tracking/${encodeURIComponent(trackingNumber)}?email=${encodeURIComponent(email)}`,
        )
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
              .bindPopup(`<b>Driver position</b><br/>Updated ${loc.updatedAt ? formatTime(loc.updatedAt) : "just now"}`)
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
  }, [trackingNumber, email])

  useEffect(() => {
    async function placeMarkers() {
      const L = (await import("leaflet")).default
      if (!mapRef.current) return
      let added = false
      let attempted = 0

      const targets: {
        ref: { current: L.Marker | null }
        label: string
        value: string
        coord: { lat: number; lng: number } | null
        color: string
        glyph: string
      }[] = [
        {
          ref: pickupMarkerRef,
          label: "Pickup",
          value: data?.pickupAddress ?? data?.liveTracking?.pickupAddress ?? "",
          coord: data?.coordinates?.pickup ?? null,
          color: "#16a34a",
          glyph: "📦",
        },
        {
          ref: deliveryMarkerRef,
          label: "Delivery",
          value: data?.deliveryAddress ?? data?.liveTracking?.deliveryAddress ?? "",
          coord: data?.coordinates?.delivery ?? null,
          color: "#dc2626",
          glyph: "🏠",
        },
      ]

      for (const { ref, label, value, coord, color, glyph } of targets) {
        if (!value) continue
        attempted++
        if (ref.current) {
          ref.current.remove()
          ref.current = null
        }
        const point = coord ?? (await geocode(value))
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

      if (added && boundsRef.current.length >= 2 && mapRef.current) {
        mapRef.current.fitBounds(L.latLngBounds(boundsRef.current).pad(0.3))
      }
    }

    void placeMarkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data?.pickupAddress,
    data?.deliveryAddress,
    data?.coordinates?.pickup?.lat,
    data?.coordinates?.pickup?.lng,
    data?.coordinates?.delivery?.lat,
    data?.coordinates?.delivery?.lng,
    data?.liveTracking?.pickupAddress,
    data?.liveTracking?.deliveryAddress,
    mapReady,
  ])

  useEffect(() => {
    // When a route is shown, keep the full route in view instead of re-fitting
    // to the driver's accumulated positions on every poll.
    if (!routeLineRef.current && boundsRef.current.length >= 2 && leafletRef.current && mapRef.current) {
      mapRef.current.fitBounds(leafletRef.current.latLngBounds(boundsRef.current).pad(0.3))
    }
  }, [driver])

  const routeKey = data?.route
    ? `${data.route.distanceM}:${data.route.durationS}:${data.route.isFallback}`
    : ""

  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return

    if (routeLineRef.current) {
      routeLineRef.current.remove()
      routeLineRef.current = null
    }

    const route = data?.route
    if (!route || route.geometry.length < 2) return

    routeLineRef.current = L.polyline(route.geometry, {
      color: route.isFallback ? "#f59e0b" : "#2563eb",
      weight: 5,
      opacity: 0.7,
      dashArray: route.isFallback ? "8 8" : undefined,
    }).addTo(map)

    map.fitBounds(L.latLngBounds(route.geometry).pad(0.2))
    // routeKey keeps this effect from redrawing and re-fitting on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, mapReady])

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
                      Last update: {driver.updatedAt ? formatTime(driver.updatedAt) : "just now"}
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

              {data?.route ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Route:</span>
                  </div>
                  <p className="text-sm font-medium pl-6">
                    {formatDistance(data.route.distanceM)} · ~
                    {Math.max(1, Math.round(data.route.durationS / 60))} min
                  </p>
                  {data.route.isFallback ? (
                    <p className="text-xs text-amber-600 pl-6">Approximate route — live road routing is unavailable.</p>
                  ) : null}
                </div>
              ) : null}
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
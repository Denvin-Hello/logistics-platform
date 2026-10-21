"use client"

import { useEffect, useRef, useState } from "react"
import type * as L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { GeoPoint } from "@/lib/geo"
import type { RouteResult } from "@/lib/routing"

const JOBURG: [number, number] = [-26.2041, 28.0473]

function pinIcon(L: typeof import("leaflet"), color: string, glyph: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid white">${glyph}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

function driverIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:#2563eb;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,.3);border:2px solid white">🚚</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

interface TripMapProps {
  pickup: GeoPoint | null
  delivery: GeoPoint | null
  route: RouteResult | null
  driver: { lat: number; lng: number; accuracy?: number | null } | null
  radiusM: number
}

export function TripMap({ pickup, delivery, route, driver, radiusM }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<typeof import("leaflet") | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const overlaysRef = useRef<L.LayerGroup | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const driverCircleRef = useRef<L.Circle | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let disposed = false

    async function initMap() {
      const L = (await import("leaflet")).default
      if (disposed || !containerRef.current || mapRef.current) return

      leafletRef.current = L
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(JOBURG, 11)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)
      mapRef.current = map
      setMapReady(true)
    }

    void initMap()

    return () => {
      disposed = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      leafletRef.current = null
      overlaysRef.current = null
      driverMarkerRef.current = null
      driverCircleRef.current = null
      setMapReady(false)
    }
  }, [])

  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map) return

    if (overlaysRef.current) {
      overlaysRef.current.remove()
      overlaysRef.current = null
    }

    const layers = L.layerGroup().addTo(map)
    overlaysRef.current = layers
    const bounds = L.latLngBounds([])

    if (pickup) {
      L.marker([pickup.lat, pickup.lng], { icon: pinIcon(L, "#16a34a", "📦") })
        .bindPopup("<b>Pickup</b>")
        .addTo(layers)
      bounds.extend([pickup.lat, pickup.lng])
    }

    if (delivery) {
      L.marker([delivery.lat, delivery.lng], { icon: pinIcon(L, "#dc2626", "🏠") })
        .bindPopup("<b>Destination</b>")
        .addTo(layers)
      L.circle([delivery.lat, delivery.lng], {
        radius: radiusM,
        color: "#dc2626",
        weight: 1,
        fillColor: "#dc2626",
        fillOpacity: 0.08,
      }).addTo(layers)
      bounds.extend([delivery.lat, delivery.lng])
    }

    if (route) {
      L.polyline(route.geometry, {
        color: route.isFallback ? "#f59e0b" : "#2563eb",
        weight: 5,
        opacity: 0.75,
        dashArray: route.isFallback ? "8 8" : undefined,
      }).addTo(layers)
      for (const point of route.geometry) bounds.extend(point)
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.2), { maxZoom: 15 })
    }
  }, [pickup, delivery, route, radiusM, mapReady])

  useEffect(() => {
    const L = leafletRef.current
    const map = mapRef.current
    if (!L || !map || !driver) return

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([driver.lat, driver.lng], { icon: driverIcon(L) })
        .bindPopup("Your position")
        .addTo(map)
    } else {
      driverMarkerRef.current.setLatLng([driver.lat, driver.lng])
    }

    if (driver.accuracy != null && driver.accuracy > 0) {
      if (!driverCircleRef.current) {
        driverCircleRef.current = L.circle([driver.lat, driver.lng], {
          radius: driver.accuracy,
          color: "#2563eb",
          weight: 1,
          fillColor: "#2563eb",
          fillOpacity: 0.08,
        }).addTo(map)
      } else {
        driverCircleRef.current.setLatLng([driver.lat, driver.lng])
        driverCircleRef.current.setRadius(driver.accuracy)
      }
    }
  }, [driver, mapReady])

  return <div ref={containerRef} className="h-[420px] w-full z-0 rounded-3xl" />
}

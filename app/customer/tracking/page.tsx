"use client"

import { useState } from "react"
import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { TrackingForm } from "@/components/tracking/tracking-form"
import { TrackingTimeline } from "@/components/tracking/tracking-timeline"
import { LiveMap } from "@/components/tracking/live-map"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Map } from "lucide-react"

interface TrackingEvent {
  id: string
  status: string
  description: string
  location: string
  timestamp: string
  completed: boolean
}

interface LiveTrackingInfo {
  currentLocation: { lat: number; lng: number; address: string }
  destination: { lat: number; lng: number; address: string }
  estimatedArrival: string
  driverInfo: { name: string; phone: string; vehicle: string }
}

interface TrackingData {
  status: string
  estimatedDelivery: string
  events: TrackingEvent[]
  liveTracking?: LiveTrackingInfo
}

export default function CustomerTrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null)
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const handleTrack = async (number: string) => {
    setNotFound(false)
    setShowMap(false)
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(number)}`)
      if (res.status === 404) {
        setNotFound(true)
        setTrackingData(null)
        setTrackingNumber(number)
        return
      }
      if (!res.ok) throw new Error("tracking failed")
      const data: TrackingData = await res.json()
      setTrackingData(data)
      setTrackingNumber(number)
    } catch {
      setNotFound(true)
      setTrackingData(null)
      setTrackingNumber(number)
    }
  }

  const handleBack = () => {
    setTrackingNumber(null)
    setTrackingData(null)
    setNotFound(false)
    setShowMap(false)
  }

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {!trackingNumber ? (
            <div>
              <h1 className="text-3xl font-bold mb-2">Track Your Packages</h1>
              <p className="text-muted-foreground mb-8">
                Enter your order number to see real-time updates on your delivery
              </p>
              <div className="max-w-md">
                <TrackingForm onTrack={handleTrack} />
              </div>
            </div>
          ) : notFound ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Tracking Number Not Found</h2>
              <p className="text-muted-foreground mb-8">
                We couldn't find any information for tracking number "{trackingNumber}". Please check the number and try
                again.
              </p>
              <Button onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : trackingData ? (
            <div>
              <div className="flex items-center justify-between mb-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Search
                </Button>

                {trackingData.status === "In Transit" && (
                  <Button variant={showMap ? "secondary" : "default"} onClick={() => setShowMap(!showMap)}>
                    <Map className="h-4 w-4 mr-2" />
                    {showMap ? "Show Timeline" : "Live Map"}
                  </Button>
                )}
              </div>

              {showMap && trackingData.liveTracking ? (
                <LiveMap
                  trackingNumber={trackingNumber}
                  currentLocation={trackingData.liveTracking.currentLocation}
                  destination={trackingData.liveTracking.destination}
                  estimatedArrival={trackingData.liveTracking.estimatedArrival}
                  driverInfo={trackingData.liveTracking.driverInfo}
                />
              ) : (
                <TrackingTimeline
                  trackingNumber={trackingNumber}
                  events={trackingData.events}
                  currentStatus={trackingData.status}
                  estimatedDelivery={trackingData.estimatedDelivery}
                />
              )}
            </div>
          ) : (
            <div className="text-center">Loading tracking details…</div>
          )}
        </div>
      </div>
    </div>
  )
}
"use client"

import { useState } from "react"
import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { TrackingForm } from "@/components/tracking/tracking-form"
import { TrackingTimeline } from "@/components/tracking/tracking-timeline"
import { LiveMap } from "@/components/tracking/live-map"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Map } from "lucide-react"

// Mock tracking data (same as main tracking page)
const mockTrackingData = {
  ORD001: {
    status: "In Transit",
    estimatedDelivery: "Today, 3:30 PM",
    events: [
      {
        id: "1",
        status: "Order Placed",
        description: "Your delivery order has been confirmed and payment processed",
        location: "Cape Town, South Africa",
        timestamp: "Today, 10:00 AM",
        completed: true,
      },
      {
        id: "2",
        status: "Picked Up",
        description: "Package has been collected from pickup location",
        location: "123 Main Street, Cape Town",
        timestamp: "Today, 11:30 AM",
        completed: true,
      },
      {
        id: "3",
        status: "In Transit",
        description: "Package is on the way to destination",
        location: "N1 Highway, en route to Stellenbosch",
        timestamp: "Today, 12:45 PM",
        completed: true,
      },
      {
        id: "4",
        status: "Out for Delivery",
        description: "Package is out for final delivery",
        location: "Stellenbosch, South Africa",
        timestamp: "Expected: Today, 3:00 PM",
        completed: false,
      },
      {
        id: "5",
        status: "Delivered",
        description: "Package has been successfully delivered",
        location: "456 Oak Avenue, Stellenbosch",
        timestamp: "Expected: Today, 3:30 PM",
        completed: false,
      },
    ],
    liveTracking: {
      currentLocation: {
        lat: -33.9249,
        lng: 18.4241,
        address: "N1 Highway, 15km from Stellenbosch",
      },
      destination: {
        lat: -33.9321,
        lng: 18.8602,
        address: "456 Oak Avenue, Stellenbosch, 7600",
      },
      estimatedArrival: "Today, 3:30 PM",
      driverInfo: {
        name: "Alex Driver",
        phone: "+27 82 123 4567",
        vehicle: "White Toyota Hilux - CA 123 456",
      },
    },
  },
}

export default function CustomerTrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  const handleTrack = (number: string) => {
    setTrackingNumber(number)
    setShowMap(false)
  }

  const handleBack = () => {
    setTrackingNumber(null)
    setShowMap(false)
  }

  const trackingData = trackingNumber ? mockTrackingData[trackingNumber as keyof typeof mockTrackingData] : null

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {!trackingNumber ? (
            <div>
              <h1 className="text-3xl font-bold mb-2">Track Your Packages</h1>
              <p className="text-muted-foreground mb-8">
                Enter a tracking number to see real-time updates on your delivery
              </p>
              <div className="max-w-md">
                <TrackingForm onTrack={handleTrack} />
              </div>
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
          )}
        </div>
      </div>
    </div>
  )
}

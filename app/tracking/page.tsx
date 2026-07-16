"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { TrackingForm } from "@/components/tracking/tracking-form"
import { TrackingTimeline } from "@/components/tracking/tracking-timeline"
import { LiveMap } from "@/components/tracking/live-map"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Map } from "lucide-react"

// Mock tracking data
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
  ORD002: {
    status: "Delivered",
    estimatedDelivery: "Delivered",
    events: [
      {
        id: "1",
        status: "Order Placed",
        description: "Your delivery order has been confirmed and payment processed",
        location: "Durban, South Africa",
        timestamp: "Yesterday, 9:00 AM",
        completed: true,
      },
      {
        id: "2",
        status: "Picked Up",
        description: "Package has been collected from pickup location",
        location: "789 Pine Road, Durban",
        timestamp: "Yesterday, 10:30 AM",
        completed: true,
      },
      {
        id: "3",
        status: "In Transit",
        description: "Package is on the way to destination",
        location: "N3 Highway, en route to Pietermaritzburg",
        timestamp: "Yesterday, 11:45 AM",
        completed: true,
      },
      {
        id: "4",
        status: "Out for Delivery",
        description: "Package is out for final delivery",
        location: "Pietermaritzburg, South Africa",
        timestamp: "Yesterday, 2:00 PM",
        completed: true,
      },
      {
        id: "5",
        status: "Delivered",
        description: "Package has been successfully delivered and signed for",
        location: "321 Elm Street, Pietermaritzburg",
        timestamp: "Yesterday, 2:45 PM",
        completed: true,
      },
    ],
  },
  ORD003: {
    status: "Pending",
    estimatedDelivery: "Today, 5:00 PM",
    events: [
      {
        id: "1",
        status: "Order Placed",
        description: "Your delivery order has been confirmed and payment processed",
        location: "Johannesburg, South Africa",
        timestamp: "Today, 8:00 AM",
        completed: true,
      },
      {
        id: "2",
        status: "Provider Assigned",
        description: "A delivery provider has been assigned to your order",
        location: "Johannesburg, South Africa",
        timestamp: "Today, 8:30 AM",
        completed: true,
      },
      {
        id: "3",
        status: "Pending Pickup",
        description: "Provider is on the way to pickup location",
        location: "555 Cedar Lane, Johannesburg",
        timestamp: "Expected: Today, 2:00 PM",
        completed: false,
      },
      {
        id: "4",
        status: "In Transit",
        description: "Package will be on the way to destination",
        location: "En route to Pretoria",
        timestamp: "Expected: Today, 3:00 PM",
        completed: false,
      },
      {
        id: "5",
        status: "Delivered",
        description: "Package will be delivered to recipient",
        location: "777 Birch Drive, Pretoria",
        timestamp: "Expected: Today, 5:00 PM",
        completed: false,
      },
    ],
  },
}

export default function TrackingPage() {
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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {!trackingNumber ? (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Track Your Package</h1>
            <p className="text-muted-foreground mb-8">
              Enter your tracking number to see real-time updates on your delivery
            </p>
            <TrackingForm onTrack={handleTrack} />
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
  )
}

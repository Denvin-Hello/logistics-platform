"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Truck, Navigation, Clock } from "lucide-react"

interface LiveMapProps {
  trackingNumber: string
  currentLocation: {
    lat: number
    lng: number
    address: string
  }
  destination: {
    lat: number
    lng: number
    address: string
  }
  estimatedArrival: string
  driverInfo: {
    name: string
    phone: string
    vehicle: string
  }
}

export function LiveMap({ trackingNumber, currentLocation, destination, estimatedArrival, driverInfo }: LiveMapProps) {
  const [isLive, setIsLive] = useState(true)

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive((prev) => !prev)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Map Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-accent" />
                Live Tracking - #{trackingNumber}
              </CardTitle>
              <CardDescription>Real-time location updates</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLive ? "bg-green-500" : "bg-gray-400"} animate-pulse`} />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map Placeholder */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 h-96 rounded-lg overflow-hidden">
                {/* Simulated map with route */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="relative">
                      {/* Route line */}
                      <div className="absolute top-1/2 left-8 right-8 h-1 bg-accent/30 rounded-full" />
                      <div className="absolute top-1/2 left-8 w-1/3 h-1 bg-accent rounded-full" />

                      {/* Start point */}
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <div className="bg-green-500 rounded-full p-2">
                          <MapPin className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      {/* Current position */}
                      <div className="absolute left-1/3 top-1/2 transform -translate-y-1/2 animate-pulse">
                        <div className="bg-accent rounded-full p-2">
                          <Truck className="h-4 w-4 text-accent-foreground" />
                        </div>
                      </div>

                      {/* End point */}
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <div className="bg-red-500 rounded-full p-2">
                          <MapPin className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-black/90 rounded-lg p-4 max-w-sm mx-auto">
                      <p className="text-sm font-medium">Interactive Map</p>
                      <p className="text-xs text-muted-foreground">
                        In a real implementation, this would show a live map with GPS tracking
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tracking Info */}
        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  <Truck className="h-3 w-3 mr-1" />
                  In Transit
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Current Location:</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">{currentLocation.address}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Estimated Arrival:</span>
                </div>
                <p className="text-sm font-medium pl-6">{estimatedArrival}</p>
              </div>
            </CardContent>
          </Card>

          {/* Driver Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Driver Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">Name:</span>
                <p className="text-sm text-muted-foreground">{driverInfo.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Phone:</span>
                <p className="text-sm text-muted-foreground">{driverInfo.phone}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Vehicle:</span>
                <p className="text-sm text-muted-foreground">{driverInfo.vehicle}</p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm font-medium">From:</span>
                <p className="text-sm text-muted-foreground">123 Main Street, Cape Town</p>
              </div>
              <div>
                <span className="text-sm font-medium">To:</span>
                <p className="text-sm text-muted-foreground">{destination.address}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Distance:</span>
                <p className="text-sm text-muted-foreground">45.2 km</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

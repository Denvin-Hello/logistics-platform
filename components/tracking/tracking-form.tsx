"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Package } from "lucide-react"

interface TrackingFormProps {
  onTrack: (trackingNumber: string) => void
}

export function TrackingForm({ onTrack }: TrackingFormProps) {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber.trim()) return

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      onTrack(trackingNumber.trim())
    }, 1000)
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-accent/10 rounded-full p-3 w-fit mb-4">
          <Package className="h-8 w-8 text-accent" />
        </div>
        <CardTitle>Track Your Package</CardTitle>
        <CardDescription>Enter your tracking number to see real-time delivery updates</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking-number">Tracking Number</Label>
            <Input
              id="tracking-number"
              placeholder="Enter tracking number (e.g., ORD001, DEL123)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Tracking...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Track Package
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-medium mb-2">Sample tracking numbers to try:</p>
          <div className="space-y-1">
            <button onClick={() => setTrackingNumber("ORD001")} className="block text-accent hover:underline">
              ORD001 - In Transit
            </button>
            <button onClick={() => setTrackingNumber("ORD002")} className="block text-accent hover:underline">
              ORD002 - Delivered
            </button>
            <button onClick={() => setTrackingNumber("ORD003")} className="block text-accent hover:underline">
              ORD003 - Pending Pickup
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

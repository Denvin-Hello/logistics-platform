"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Package } from "lucide-react"

interface TrackingFormProps {
  onTrack: (trackingNumber: string, email: string) => void
}

export function TrackingForm({ onTrack }: TrackingFormProps) {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackingNumber.trim() || !email.trim()) return

    setIsLoading(true)
    onTrack(trackingNumber.trim(), email.trim())
    setIsLoading(false)
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto bg-accent/10 rounded-full p-3 w-fit mb-4">
          <Package className="h-8 w-8 text-accent" />
        </div>
        <CardTitle>Track Your Package</CardTitle>
        <CardDescription>Enter your order number and email to see live delivery updates</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking-number">Order Number</Label>
            <Input
              id="tracking-number"
              placeholder="e.g. ORD1A2B3C4D5E6F"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking-email">Email on the order</Label>
            <Input
              id="tracking-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <p className="font-medium mb-2">Use the order number and email from your order confirmation.</p>
        </div>
      </CardContent>
    </Card>
  )
}

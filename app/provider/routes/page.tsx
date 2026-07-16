"use client"

import { useMemo } from "react"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { routeNotes, initialDeliveries } from "@/components/provider/provider-data"
import { MapPin, ArrowRight, Globe } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ProviderRoutesPage() {
  const routeCount = useMemo(() => initialDeliveries.length, [])
  const pendingCount = useMemo(() => initialDeliveries.filter((delivery) => delivery.status === "pending").length, [])
  const inTransitCount = useMemo(() => initialDeliveries.filter((delivery) => delivery.status === "in-transit").length, [])

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Route Planning</h1>
            <p className="text-muted-foreground">Optimize your delivery path for faster service.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: "Route planner", description: "Routing assistant is ready." })}>
            View map
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Open routes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{routeCount}</p>
              <p className="text-sm text-muted-foreground">Total active delivery routes.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending stops</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Orders waiting to be picked up.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>In transit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{inTransitCount}</p>
              <p className="text-sm text-muted-foreground">Packages currently on the road.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-border bg-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Route recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {routeNotes.map((note) => (
                  <li key={note} className="rounded-3xl bg-card p-4">
                    <p>{note}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Delivery path summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>
                The fastest route flows from Cape Town to Durban and then toward Johannesburg/Pretoria. Use this page to preview route grouping and resource allocation.
              </p>
              <div className="rounded-3xl bg-muted p-4">
                <p className="font-semibold">Next scheduled stop</p>
                <p>321 Elm St, Pietermaritzburg</p>
              </div>
              <Button variant="secondary" onClick={() => toast({ title: "Route saved", description: "Your updated route has been saved." })}>
                Save plan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

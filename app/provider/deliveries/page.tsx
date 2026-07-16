"use client"

import { useState } from "react"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeliveryCard } from "@/components/provider/delivery-card"
import { Button } from "@/components/ui/button"
import { initialDeliveries, Delivery } from "@/components/provider/provider-data"
import { toast } from "@/hooks/use-toast"

export default function ProviderDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries)

  const handleAccept = (id: string) => {
    setDeliveries((current) =>
      current.map((delivery) =>
        delivery.id === id ? { ...delivery, status: "in-transit" } : delivery,
      ),
    )
    toast({ title: "Delivery accepted", description: `Delivery ${id} is now in transit.` })
  }

  const handleMarkDelivered = (id: string) => {
    setDeliveries((current) =>
      current.map((delivery) =>
        delivery.id === id ? { ...delivery, status: "delivered" } : delivery,
      ),
    )
    toast({ title: "Delivery completed", description: `Delivery ${id} is marked delivered.` })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Active Deliveries</h1>
            <p className="text-muted-foreground">Manage deliveries and move orders through the workflow.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: "Filters", description: "Delivery filters are coming soon." })}>
            Filter deliveries
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          {deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              onAccept={() => handleAccept(delivery.id)}
              onMarkDelivered={() => handleMarkDelivered(delivery.id)}
              onViewDetails={() => toast({ title: delivery.id, description: `View details for ${delivery.customerName}.` })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

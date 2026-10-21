"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/format"
import { Loader2, MapPin, Package, DollarSign, PackageOpen, Clock } from "lucide-react"

export interface AvailableOrder {
  id: string
  orderNumber: string
  customerName: string
  pickupAddress: string
  deliveryAddress: string
  amount: number
  baseAmount?: number | null
  packageType: string
  createdAt: string
}

export function AvailableOrders({ orders }: { orders: AvailableOrder[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  const act = async (order: AvailableOrder, action: "accept" | "decline") => {
    setBusyId(order.id)
    try {
      const res = await fetch(`/api/provider/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Action failed", description: data.error || "Something went wrong." })
        return
      }
      toast({
        title: action === "accept" ? "Delivery accepted" : "Delivery declined",
        description:
          action === "accept"
            ? `${order.orderNumber} is now assigned to you. Start the trip when you pick it up.`
            : `${order.orderNumber} was returned to the pool.`,
      })
      router.refresh()
    } catch {
      toast({ title: "Action failed", description: "Unable to update the delivery. Try again." })
    } finally {
      setBusyId(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed">
        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          No available deliveries right now. New customer orders will appear here for you to accept.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
              <Badge variant="secondary">Available</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Pickup</p>
                  <p className="text-muted-foreground">{order.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium">Delivery</p>
                  <p className="text-muted-foreground">{order.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>{order.packageType}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>R{order.amount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(order.createdAt)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={busyId === order.id}
                onClick={() => void act(order, "accept")}
              >
                {busyId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Accept Delivery
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 bg-transparent text-red-600 hover:text-red-700"
                disabled={busyId === order.id}
                onClick={() => void act(order, "decline")}
              >
                Decline
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/format"
import { AlertTriangle, Clock, Loader2, MapPin, Package, RefreshCw, Send, Users } from "lucide-react"

export interface DispatchOrder {
  id: string
  orderNumber: string
  customerName: string
  pickupAddress: string
  deliveryAddress: string
  amount: number
  packageType: string
  createdAt: string
  attempts: number
  ageMinutes: number
  pendingOffers: number
  urgent: boolean
  escalated: boolean
}

export interface DispatchProvider {
  id: string
  name: string | null
  businessName: string | null
  vehicleType: string | null
  serviceArea: string | null
  isAvailable: boolean
}

type DispatchAction = "retry" | "widen" | "urgent" | "manual"

export function DispatchBoard({
  orders,
  providers,
}: {
  orders: DispatchOrder[]
  providers: DispatchProvider[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<Record<string, string>>({})

  const act = async (order: DispatchOrder, action: DispatchAction) => {
    const providerId = selectedProvider[order.id]
    if (action === "manual" && !providerId) {
      toast({ title: "Select a provider", description: "Choose a provider before assigning." })
      return
    }

    setBusy(`${order.id}:${action}`)
    try {
      const res = await fetch(`/api/admin/dispatch/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, providerId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Dispatch action failed", description: data.error || "Try again." })
        return
      }
      toast({
        title:
          action === "manual"
            ? "Provider assigned"
            : action === "urgent"
              ? "Opened to the provider pool"
              : action === "widen"
                ? "Offers widened"
                : "Offers sent",
        description: `${order.orderNumber} was updated.`,
      })
      router.refresh()
    } catch {
      toast({ title: "Dispatch action failed", description: "Unable to reach the server." })
    } finally {
      setBusy(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Package className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">No unassigned deliveries. The dispatch queue is clear.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className={order.urgent ? "border-red-300 dark:border-red-900" : undefined}>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  #{order.orderNumber}
                  {order.urgent ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Urgent
                    </Badge>
                  ) : order.escalated ? (
                    <Badge variant="secondary">Escalated</Badge>
                  ) : (
                    <Badge variant="outline">Queued</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">Customer: {order.customerName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {order.ageMinutes}m old
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {order.pendingOffers} open offer{order.pendingOffers === 1 ? "" : "s"}
                </span>
                <span>Attempt {order.attempts}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Pickup</p>
                  <p className="text-muted-foreground">{order.pickupAddress}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-accent" />
                <div>
                  <p className="font-medium">Delivery</p>
                  <p className="text-muted-foreground">{order.deliveryAddress}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>{order.packageType}</span>
              <span>R{order.amount}</span>
              <span>Created {formatDate(order.createdAt)}</span>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void act(order, "retry")}
                >
                  {busy === `${order.id}:retry` ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Retry offers
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void act(order, "widen")}
                >
                  {busy === `${order.id}:widen` ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Widen radius
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null || order.urgent}
                  onClick={() => void act(order, "urgent")}
                >
                  {busy === `${order.id}:urgent` ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-1 h-4 w-4" />
                  )}
                  Open pool
                </Button>
              </div>

              <div className="flex flex-1 items-center gap-2 lg:justify-end">
                <Select
                  value={selectedProvider[order.id]}
                  onValueChange={(value) =>
                    setSelectedProvider((current) => ({ ...current, [order.id]: value }))
                  }
                >
                  <SelectTrigger className="w-full lg:w-[260px]">
                    <SelectValue placeholder="Assign manually to..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.businessName || provider.name}
                        {provider.vehicleType ? ` · ${provider.vehicleType}` : ""}
                        {provider.isAvailable ? " · available" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={busy !== null || !selectedProvider[order.id]}
                  onClick={() => void act(order, "manual")}
                >
                  {busy === `${order.id}:manual` ? (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  ) : null}
                  Assign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

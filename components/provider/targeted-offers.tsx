"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/format"
import { Clock, DollarSign, Loader2, MapPin, Package, Timer } from "lucide-react"

export interface TargetedOffer {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  pickupAddress: string
  deliveryAddress: string
  amount: number
  packageType: string
  createdAt: string
  expiresAt: string
  distanceKm: number | null
}

function remainingLabel(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return "Expired"
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.floor((ms % 60_000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")} left`
}

export function TargetedOffers({ offers }: { offers: TargetedOffer[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 15_000)
    return () => clearInterval(interval)
  }, [])

  const act = async (offer: TargetedOffer, action: "accept" | "decline") => {
    setBusyId(offer.orderId)
    try {
      const res = await fetch(`/api/provider/orders/${offer.orderId}`, {
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
        title: action === "accept" ? "Delivery accepted" : "Offer declined",
        description:
          action === "accept"
            ? `${offer.orderNumber} is now assigned to you.`
            : `${offer.orderNumber} was returned to the dispatch queue.`,
      })
      router.refresh()
    } catch {
      toast({ title: "Action failed", description: "Unable to update the delivery. Try again." })
    } finally {
      setBusyId(null)
    }
  }

  if (offers.length === 0) return null

  return (
    <section className="mb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Offers for you</h2>
          <p className="text-sm text-muted-foreground">
            These deliveries were matched to your vehicle and service area. Respond before they expire.
          </p>
        </div>
        <Badge variant="secondary">{offers.length} active</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {offers.map((offer) => {
          const expired = new Date(offer.expiresAt).getTime() <= Date.now()
          return (
            <Card key={offer.id} className="border-accent/40 shadow-sm" data-tick={tick}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">#{offer.orderNumber}</CardTitle>
                  <Badge variant={expired ? "outline" : "default"}>
                    {expired ? "Expired" : "Offer"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Customer: {offer.customerName}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  {remainingLabel(offer.expiresAt)}
                  {offer.distanceKm != null ? ` · ${offer.distanceKm.toFixed(1)} km away` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">Pickup</p>
                      <p className="text-muted-foreground">{offer.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-accent" />
                    <div className="text-sm">
                      <p className="font-medium">Delivery</p>
                      <p className="text-muted-foreground">{offer.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{offer.packageType}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>R{offer.amount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(offer.createdAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={busyId === offer.orderId || expired}
                    onClick={() => void act(offer, "accept")}
                  >
                    {busyId === offer.orderId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Accept offer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 bg-transparent text-red-600 hover:text-red-700"
                    disabled={busyId === offer.orderId || expired}
                    onClick={() => void act(offer, "decline")}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

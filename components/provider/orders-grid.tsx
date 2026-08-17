"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DeliveryCard } from "@/components/provider/delivery-card"
import { toast } from "@/hooks/use-toast"
import { Loader2, PackageOpen } from "lucide-react"

export interface ProviderOrder {
  id: string
  orderNumber: string
  customerName: string
  pickupAddress: string
  deliveryAddress: string
  status: string
  amount: number
  packageType: string
  createdAt: string
}

type CardStatus = "pending" | "in-transit" | "delivered"

function toCardStatus(status: string): CardStatus {
  if (status === "IN_TRANSIT") return "in-transit"
  if (status === "DELIVERED") return "delivered"
  return "pending"
}

function statusLabel(status: string): string {
  if (status === "IN_TRANSIT") return "In transit"
  if (status === "DELIVERED") return "Completed"
  if (status === "ASSIGNED") return "Awaiting pickup"
  return "Pending"
}

export function OrdersGrid({ orders }: { orders: ProviderOrder[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ProviderOrder | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const runAction = async (order: ProviderOrder, action: "accept" | "deliver") => {
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
        title: action === "accept" ? "Delivery accepted" : "Delivery completed",
        description: `${order.orderNumber} is now ${action === "accept" ? "in transit" : "delivered"}.`,
      })
      router.refresh()
    } catch {
      toast({ title: "Action failed", description: "Unable to update the order. Try again." })
    } finally {
      setBusyId(null)
    }
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PackageOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">No deliveries assigned yet</h3>
        <p className="text-muted-foreground max-w-md mt-2">
          When customers pay for orders, they'll be assigned to you here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {orders.map((order) => (
          <DeliveryCard
            key={order.id}
            delivery={{
              id: order.orderNumber,
              customerName: order.customerName,
              pickupAddress: order.pickupAddress,
              deliveryAddress: order.deliveryAddress,
              status: toCardStatus(order.status),
              amount: order.amount,
              estimatedTime: statusLabel(order.status),
              packageType: order.packageType,
            }}
            onAccept={
              order.status === "ASSIGNED"
                ? () => {
                    void runAction(order, "accept")
                  }
                : undefined
            }
            onMarkDelivered={
              order.status === "IN_TRANSIT"
                ? () => {
                    void runAction(order, "deliver")
                  }
                : undefined
            }
            onViewDetails={() => setSelected(order)}
          />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Delivery details</DialogTitle>
            <DialogDescription>Review order information and take action.</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 py-2">
              <div className="rounded-3xl border border-border bg-muted p-4">
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-semibold">{selected.orderNumber}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">{selected.customerName}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Package</p>
                  <p className="font-semibold">{selected.packageType}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Pickup Address</p>
                  <p className="font-semibold">{selected.pickupAddress}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Delivery Address</p>
                  <p className="font-semibold">{selected.deliveryAddress}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold uppercase">{statusLabel(selected.status)}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">R{selected.amount}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Placed</p>
                  <p className="font-semibold">{new Date(selected.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {selected?.status === "ASSIGNED" && (
              <Button
                disabled={busyId === selected.id}
                onClick={() => selected && void runAction(selected, "accept")}
              >
                {busyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Accept Delivery
              </Button>
            )}
            {selected?.status === "IN_TRANSIT" && (
              <Button
                disabled={busyId === selected.id}
                onClick={() => selected && void runAction(selected, "deliver")}
              >
                {busyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Mark Delivered
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
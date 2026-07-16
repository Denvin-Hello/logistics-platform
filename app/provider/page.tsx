"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { DeliveryCard } from "@/components/provider/delivery-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { Package, DollarSign, Clock, TrendingUp, MapPin, Star, Bell, Settings } from "lucide-react"

interface Delivery {
  id: string
  customerName: string
  pickupAddress: string
  deliveryAddress: string
  status: "pending" | "in-transit" | "delivered"
  amount: number
  estimatedTime: string
  estimatedMinutes: number
  packageType: string
}

const initialDeliveries: Delivery[] = [
  {
    id: "DEL001",
    customerName: "John Smith",
    pickupAddress: "123 Main St, Cape Town",
    deliveryAddress: "456 Oak Ave, Stellenbosch",
    status: "pending",
    amount: 150,
    estimatedTime: "2h 30m",
    estimatedMinutes: 150,
    packageType: "Documents",
  },
  {
    id: "DEL002",
    customerName: "Sarah Johnson",
    pickupAddress: "789 Pine Rd, Durban",
    deliveryAddress: "321 Elm St, Pietermaritzburg",
    status: "in-transit",
    amount: 280,
    estimatedTime: "1h 45m",
    estimatedMinutes: 105,
    packageType: "Electronics",
  },
  {
    id: "DEL003",
    customerName: "Mike Wilson",
    pickupAddress: "555 Cedar Ln, Johannesburg",
    deliveryAddress: "777 Birch Dr, Pretoria",
    status: "delivered",
    amount: 200,
    estimatedTime: "Completed",
    estimatedMinutes: 0,
    packageType: "Clothing",
  },
]

function formatAverageTime(minutes: number) {
  if (minutes <= 0) {
    return "—"
  }
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours}h ${remainder}m`
}

export default function ProviderDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>(initialDeliveries)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const activeDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.status !== "delivered"),
    [deliveries],
  )

  const totalEarnings = useMemo(
    () => deliveries.reduce((sum, delivery) => (delivery.status !== "pending" ? sum + delivery.amount : sum), 0),
    [deliveries],
  )

  const averageDeliveryTime = useMemo(() => {
    const valuedDeliveries = deliveries.filter((delivery) => delivery.estimatedMinutes > 0)
    if (valuedDeliveries.length === 0) return "—"
    const totalMinutes = valuedDeliveries.reduce((sum, delivery) => sum + delivery.estimatedMinutes, 0)
    return formatAverageTime(Math.round(totalMinutes / valuedDeliveries.length))
  }, [deliveries])

  const rating = useMemo(() => 4.8, [])

  const activeCount = activeDeliveries.length

  const handleAcceptDelivery = (id: string) => {
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
    toast({ title: "Delivery complete", description: `Delivery ${id} has been marked delivered.` })
  }

  const handleViewDetails = (delivery: Delivery) => {
    setSelectedDelivery(delivery)
  }

  const handleOptimizeRoutes = () => {
    const sorted = [...deliveries].sort((a, b) => {
      const order = { pending: 0, "in-transit": 1, delivered: 2 }
      return order[a.status] - order[b.status]
    })
    setDeliveries(sorted)
    setShowAnalytics(true)
    toast({ title: "Routes optimized", description: "Deliveries were reordered for efficiency." })
  }

  const handleDownloadReport = () => {
    const lines = [
      ["Delivery ID", "Customer", "Pickup", "Delivery", "Status", "Amount", "Package Type"].join(","),
      ...deliveries.map((delivery) =>
        [
          delivery.id,
          delivery.customerName,
          delivery.pickupAddress,
          delivery.deliveryAddress,
          delivery.status,
          `R${delivery.amount}`,
          delivery.packageType,
        ].join(","),
      ),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "provider-deliveries-report.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: "Report downloaded", description: "Your delivery report is ready." })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, Alex Driver</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Notifications", description: "No new notifications." })}>
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Settings", description: "Open settings from the sidebar." })}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeCount}</div>
                <p className="text-xs text-muted-foreground">{activeCount > 0 ? `${activeCount} active route${activeCount === 1 ? "" : "s"}` : "No active deliveries"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R{totalEarnings}</div>
                <p className="text-xs text-muted-foreground">{deliveries.filter((d) => d.status !== "pending").length} settled orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Delivery Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageDeliveryTime}</div>
                <p className="text-xs text-muted-foreground">Calculated from active routes</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Rating</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rating}</div>
                <p className="text-xs text-muted-foreground">Based on 156 reviews</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-8">
            <Card className="border border-border bg-accent/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5 text-accent" />
                  Route Optimization
                </CardTitle>
                <CardDescription>Reorder active routes for the fastest delivery flow.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleOptimizeRoutes}>
                  Optimize Routes
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border bg-primary/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performance Analytics
                </CardTitle>
                <CardDescription>Review your delivery performance at a glance.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowAnalytics((current) => !current)}>
                  {showAnalytics ? "Hide Analytics" : "View Analytics"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border border-border bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Earnings Report
                </CardTitle>
                <CardDescription>Export your current delivery summary.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleDownloadReport}>
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {showAnalytics && (
            <section className="mb-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Delivery performance</h2>
                  <p className="text-sm text-muted-foreground">Insights from your current routes and completed deliveries.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Completion Rate</p>
                    <p className="mt-2 text-2xl font-semibold">{Math.round((deliveries.filter((d) => d.status === "delivered").length / deliveries.length) * 100)}%</p>
                  </div>
                  <div className="rounded-3xl bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pending Routes</p>
                    <p className="mt-2 text-2xl font-semibold">{deliveries.filter((d) => d.status === "pending").length}</p>
                  </div>
                  <div className="rounded-3xl bg-muted p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">In Transit</p>
                    <p className="mt-2 text-2xl font-semibold">{deliveries.filter((d) => d.status === "in-transit").length}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Recent Deliveries</h2>
                <p className="text-sm text-muted-foreground">Manage your deliveries with actions, details, and route status.</p>
              </div>
              <Button variant="outline" onClick={() => toast({ title: "Showing all deliveries", description: "Use the cards below to manage orders." })}>
                View All
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              {deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  onAccept={() => handleAcceptDelivery(delivery.id)}
                  onMarkDelivered={() => handleMarkDelivered(delivery.id)}
                  onViewDetails={() => handleViewDetails(delivery)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <Dialog open={selectedDelivery !== null} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Delivery details</DialogTitle>
            <DialogDescription>Review order information and take action from the dashboard.</DialogDescription>
          </DialogHeader>
          {selectedDelivery ? (
            <div className="space-y-4 py-2">
              <div className="rounded-3xl border border-border bg-muted p-4">
                <p className="text-sm text-muted-foreground">Delivery ID</p>
                <p className="font-semibold">{selectedDelivery.id}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold">{selectedDelivery.customerName}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Package</p>
                  <p className="font-semibold">{selectedDelivery.packageType}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Pickup Address</p>
                  <p className="font-semibold">{selectedDelivery.pickupAddress}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Delivery Address</p>
                  <p className="font-semibold">{selectedDelivery.deliveryAddress}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold uppercase">{selectedDelivery.status.replace("-", " ")}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-semibold">R{selectedDelivery.amount}</p>
                </div>
                <div className="rounded-3xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">ETA</p>
                  <p className="font-semibold">{selectedDelivery.estimatedTime}</p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            {selectedDelivery?.status === "pending" && (
              <Button onClick={() => selectedDelivery && handleAcceptDelivery(selectedDelivery.id)}>
                Accept Delivery
              </Button>
            )}
            {selectedDelivery?.status === "in-transit" && (
              <Button onClick={() => selectedDelivery && handleMarkDelivered(selectedDelivery.id)}>
                Mark Delivered
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

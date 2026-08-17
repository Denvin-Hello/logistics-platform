import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { routeNotes } from "@/components/provider/provider-data"
import { MapPin, Globe } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProviderRoutesPage() {
  const session = await getServerSession(authOptions)

  const orders = await prisma.order.findMany({
    where: { assignedProviderId: session?.user?.id },
    orderBy: { createdAt: "asc" },
  })

  const openRoutes = orders.filter((o) => o.status !== "DELIVERED").length
  const pendingStops = orders.filter((o) => o.status === "ASSIGNED").length
  const inTransit = orders.filter((o) => o.status === "IN_TRANSIT").length
  const nextStop = orders.find((o) => o.status !== "DELIVERED")

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Route Planning</h1>
            <p className="text-muted-foreground">Optimize your delivery path for faster service.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/provider/deliveries">View deliveries</Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Open routes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{openRoutes}</p>
              <p className="text-sm text-muted-foreground">Total active delivery routes.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending stops</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{pendingStops}</p>
              <p className="text-sm text-muted-foreground">Orders waiting to be picked up.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>In transit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{inTransit}</p>
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
                Use this page to preview route grouping and resource allocation for your assigned deliveries.
              </p>
              <div className="rounded-3xl bg-muted p-4">
                <p className="font-semibold">Next scheduled stop</p>
                {nextStop ? (
                  <p>{nextStop.deliveryAddress}</p>
                ) : (
                  <p>No deliveries in progress.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
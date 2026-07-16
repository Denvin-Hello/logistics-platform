"use client"

import { useMemo } from "react"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { initialDeliveries } from "@/components/provider/provider-data"
import { Download, ArrowUpRight, Clock } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ProviderEarningsPage() {
  const earnings = useMemo(
    () => initialDeliveries.reduce((sum, delivery) => sum + delivery.amount, 0),
    [],
  )
  const payout = useMemo(() => Math.round(earnings * 0.85), [earnings])
  const deliveredCount = useMemo(
    () => initialDeliveries.filter((delivery) => delivery.status === "delivered").length,
    [],
  )

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Earnings</h1>
            <p className="text-muted-foreground">Track your delivery revenue and payouts.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: "Earnings exported", description: "A CSV of earnings was generated." })}>
            <Download className="h-4 w-4 mr-2" />
            Export earnings
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">R{earnings}</p>
              <p className="text-sm text-muted-foreground">From all deliveries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Deliveries completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{deliveredCount}</p>
              <p className="text-sm text-muted-foreground">Completed delivery orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Expected payout</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">R{payout}</p>
              <p className="text-sm text-muted-foreground">After platform fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Weekly trend</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">+12%</p>
              <p className="text-sm text-muted-foreground">Compared to last week</p>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border border-border bg-accent/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-accent" />
                Payment summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Deliveries are paid out 7 days after completion.</p>
                <p>All payouts are calculated after driver commissions and service fees.</p>
                <p className="font-semibold">Next payout due: 05 August</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card">
            <CardHeader>
              <CardTitle>Revenue breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-3xl bg-muted p-4">
                <p className="font-semibold">Paid deliveries</p>
                <p>R{earnings - payout} retained by platform</p>
              </div>
              <div className="rounded-3xl bg-muted p-4">
                <p className="font-semibold">Driver share</p>
                <p>R{payout} expected to be paid out</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

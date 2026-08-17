import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight } from "lucide-react"
import { formatRands } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function ProviderEarningsPage() {
  const session = await getServerSession(authOptions)

  const orders = await prisma.order.findMany({
    where: { assignedProviderId: session?.user?.id },
    orderBy: { createdAt: "desc" },
  })

  const earnings = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.amount, 0)
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length
  const payout = Math.round(earnings * 0.85)
  const platformFee = earnings - payout

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Earnings</h1>
          <p className="text-muted-foreground">Track your delivery revenue and payouts.</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Total earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{formatRands(earnings)}</p>
              <p className="text-sm text-muted-foreground">From completed deliveries</p>
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
              <p className="text-3xl font-semibold">{formatRands(payout)}</p>
              <p className="text-sm text-muted-foreground">After platform fees</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending work</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{orders.length - deliveredCount}</p>
              <p className="text-sm text-muted-foreground">Assigned orders not yet delivered</p>
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
                <p className="font-semibold">Next payout includes {deliveredCount} completed delivery{deliveredCount === 1 ? "" : "s"}.</p>
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
                <p>{formatRands(platformFee)} retained by platform</p>
              </div>
              <div className="rounded-3xl bg-muted p-4">
                <p className="font-semibold">Driver share</p>
                <p>{formatRands(payout)} expected to be paid out</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
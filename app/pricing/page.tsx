import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Header } from "@/components/layout/header"
import { ArrowRight, Package, Ruler, Scale, Route } from "lucide-react"
import { formatRands } from "@/lib/format"
import { DEFAULT_PRICING_CONFIG } from "@/lib/pricing"
import { loadActivePricingConfig } from "@/lib/pricing-config"

export const dynamic = "force-dynamic"

export default async function PricingPage() {
  const config = await loadActivePricingConfig()
    .then((result) => result.config)
    .catch(() => DEFAULT_PRICING_CONFIG)

  const distanceRows = config.distanceBands.map((to, index) => {
    const from = index === 0 ? 0 : (config.distanceBands[index - 1] ?? 0)
    return {
      label: to === null ? `${from}+ km` : `${from}–${to} km`,
      rate: config.distanceRates[index] ?? 0,
    }
  })

  const feeRows = [
    {
      icon: Package,
      label: "Base fare",
      detail: "Every delivery starts here",
      amount: formatRands(config.baseFare),
    },
    ...distanceRows.map((row) => ({
      icon: Route,
      label: `Road distance ${row.label}`,
      detail: "Charged per kilometre on the driving route",
      amount: `${formatRands(row.rate)}/km`,
    })),
    {
      icon: Scale,
      label: "Chargeable mass",
      detail: `The heavier of actual or volumetric weight. First ${config.freeWeightKg} kg included, then ${formatRands(config.weightRates[0] ?? 0)}/kg${
        config.weightRates.length > 1 ? " with further bands" : ""
      }`,
      amount: `${formatRands(config.weightRates[0] ?? 0)}/kg`,
    },
    {
      icon: Ruler,
      label: "Volumetric weight",
      detail: `Length × width × height ÷ ${config.volumetricDivisor.toLocaleString("en-ZA")}`,
      amount: "Charged if greater",
    },
    {
      icon: Package,
      label: "Minimum charge",
      detail: "No delivery is billed below this",
      amount: formatRands(config.minimumFare),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        <div className="absolute inset-0 bg-[url('/abstract-logistics-network-lines.jpg')] opacity-10" />
        <div className="relative container mx-auto px-4 py-24 lg:py-32 text-center">
          <span className="inline-flex rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Pricing
          </span>
          <h1 className="mt-6 text-4xl lg:text-6xl font-bold text-primary-foreground text-balance">
            Pay for the road, not the guesswork.
          </h1>
          <p className="mt-6 text-xl text-primary-foreground/90 max-w-2xl mx-auto text-pretty">
            Every quote uses the actual driving distance between pickup and delivery. No subscriptions, no
            paid add-ons — just a base fare, a distance rate and a clear minimum.
          </p>
        </div>
      </section>

      {/* Base fee callout */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] border border-border bg-card p-8 lg:p-12 shadow-sm">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  Every delivery
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  Starts at {formatRands(config.baseFare)}
                </h2>
                <p className="mt-4 max-w-xl text-base text-muted-foreground">
                  That base fare covers pickup and delivery, then a rate per road kilometre applies. The final
                  price is rounded to the nearest rand and never falls below the minimum charge.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-muted p-6 lg:w-[280px] text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  Minimum charge
                </p>
                <p className="mt-3 text-4xl font-bold">{formatRands(config.minimumFare)}</p>
                <p className="mt-2 text-sm text-muted-foreground">No delivery is ever billed below this</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee breakdown table */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How your price is built</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The same stored quote is used when you confirm — the price cannot change between quote and order.
            </p>
          </div>

          <Card className="border-0 shadow-lg max-w-3xl mx-auto">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fee</TableHead>
                    <TableHead>When it applies</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeRows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-accent/10 rounded-lg p-2">
                            <row.icon className="h-4 w-4 text-accent" />
                          </div>
                          <span className="font-medium">{row.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.detail}</TableCell>
                      <TableCell className="text-right font-semibold">{row.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6 max-w-2xl mx-auto">
            Distance is measured on the road route, not a straight line. Quotes are held for{" "}
            {config.quoteTtlMinutes} minutes. Each item uses the heavier of its actual and volumetric weight;
            the first {config.freeWeightKg} kg of chargeable mass is included per quote, then the mass rate
            applies. Paid add-ons such as insurance and signatures are not part of the online flow.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary/90">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">See your exact price</h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Start an order and we'll calculate the road-distance total before you confirm anything.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/auth">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              asChild
            >
              <Link href="/about">About TDL CO</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Header } from "@/components/layout/header"
import { ArrowRight, Package, Ruler, ShieldCheck, PenLine, Scale } from "lucide-react"

const feeRows = [
  { icon: Package, label: "Base delivery fee", detail: "Every order starts here", amount: "R120.00" },
  { icon: Scale, label: "Weight", detail: "R15 per kg over the first 1kg", amount: "From R0" },
  { icon: Ruler, label: "Oversized package", detail: "Combined dimensions over 120cm", amount: "+R20.00" },
  { icon: Package, label: "Fragile handling", detail: "Extra care in transit", amount: "+R30.00" },
  { icon: ShieldCheck, label: "Insurance", detail: "Covers loss or damage in transit", amount: "+R25.00" },
  { icon: PenLine, label: "Signature required", detail: "Confirmed hand-to-hand delivery", amount: "+R10.00" },
]

export default function PricingPage() {
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
            One fee structure. No subscriptions.
          </h1>
          <p className="mt-6 text-xl text-primary-foreground/90 max-w-2xl mx-auto text-pretty">
            Pay only for the deliveries you send. A R120 base fee covers every order, with a few clear add-ons
            depending on what you're sending.
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
                  Every order
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">Starts at R120</h2>
                <p className="mt-4 max-w-xl text-base text-muted-foreground">
                  That covers pickup, transit, and delivery for a standard package up to 1kg. Anything heavier,
                  larger, fragile, insured, or requiring a signature adds a clear, fixed amount below.
                </p>
              </div>
              <div className="rounded-3xl border border-border bg-muted p-6 lg:w-[280px] text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">Minimum charge</p>
                <p className="mt-3 text-4xl font-bold">R100</p>
                <p className="mt-2 text-sm text-muted-foreground">No order is ever billed below this</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee breakdown table */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">What can change the price</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Every add-on is optional and only applies if it's relevant to your package.
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

          <p className="text-center text-sm text-muted-foreground mt-6">
            Example: a 3kg fragile package with insurance comes to R120 + R30 (weight) + R30 (fragile) + R25
            (insurance) = R205.00
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary/90">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">See your exact price</h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Start an order and we'll calculate the total before you pay anything.
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
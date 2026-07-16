import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import { Truck, Shield, MapPin, Users, ArrowRight } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        <div className="absolute inset-0 bg-[url('/abstract-logistics-network-lines.jpg')] opacity-10" />
        <div className="relative container mx-auto px-4 py-24 lg:py-32 text-center">
          <span className="inline-flex rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            About TDL CO
          </span>
          <h1 className="mt-6 text-4xl lg:text-6xl font-bold text-primary-foreground text-balance">
            Built to move things, safely, on time.
          </h1>
          <p className="mt-6 text-xl text-primary-foreground/90 max-w-2xl mx-auto text-pretty">
            TDL CO connects delivery providers with customers through one platform: real-time tracking, secure
            payments, and driver safety monitoring, all in one place.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] border border-border bg-card p-8 lg:p-12 shadow-sm">
            <span className="inline-flex rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              Our mission
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight max-w-2xl">
              Logistics shouldn't mean choosing between speed and safety.
            </h2>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              We built TDL CO because customers deserve to know exactly where their package is, providers deserve
              fair, transparent work, and every driver deserves a platform that watches out for their wellbeing on
              the road, not just the delivery clock.
            </p>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">What we do</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three things, done well, instead of everything done halfway.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <MapPin className="h-8 w-8 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Live tracking</h3>
                <p className="text-muted-foreground">
                  Every order, from pickup to delivery, visible in real time to the customer who's waiting on it.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Shield className="h-8 w-8 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Driver safety</h3>
                <p className="text-muted-foreground">
                  Fatigue and attention monitoring built into the same workflow drivers already use for deliveries.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Users className="h-8 w-8 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold text-lg mb-2">Fair connections</h3>
                <p className="text-muted-foreground">
                  A straightforward marketplace that matches customers and providers without hidden fees or
                  favoritism.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary/90">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">Ready to get moving?</h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join the customers and providers already using TDL CO to move things that matter.
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
              <Link href="/tracking">Track a Package</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
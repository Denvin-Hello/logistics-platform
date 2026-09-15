"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Header } from "@/components/layout/header"
import {
  Truck,
  Package,
  Shield,
  MapPin,
  Clock,
  Users,
  CheckCircle,
  ArrowRight,
  Globe,
  Eye,
} from "lucide-react"

export default function HomePage() {
  const heroMessages = [
    "One Platform with Endless Possibilities.",
    "Your Delivery, Our Priority.",
    "Logistics Made Simple.",
    "Send It. Track It. Delivered.",
  ]

  const [currentMessage, setCurrentMessage] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % heroMessages.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        <div className="absolute inset-0 bg-[url('/abstract-logistics-network-lines.jpg')] opacity-10" />

        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div className="text-center lg:text-left">
              <h1
  key={currentMessage}
  className="text-4xl lg:text-6xl font-bold text-primary-foreground mb-6 text-balance animate-in fade-in slide-in-from-bottom-4 duration-700"
>
  {heroMessages[currentMessage]}
</h1>

              <p className="text-xl text-primary-foreground/90 mb-8 text-pretty">                
                Connecting delivery providers with customers through one intelligent platform, 
                track in real time, pay securely, and trusted verified deliveries. 
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  asChild
                >
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
                  <Link href="/tracking">Track Package</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="bg-primary-foreground/10 rounded-2xl p-8 backdrop-blur-sm border border-primary-foreground/20">
                <div className="grid grid-cols-2 gap-4">

                  <div className="bg-accent/20 rounded-lg p-4 text-center">
                    <Package className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-primary-foreground/80">
                      Shipment Efficiency
                    </p>
                  </div>

                  <div className="bg-accent/20 rounded-lg p-4 text-center">
                    <Shield className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-primary-foreground/80">
                      Driver Compliance
                    </p>
                  </div>

                  <div className="bg-accent/20 rounded-lg p-4 text-center">
                    <MapPin className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-primary-foreground/80">
                      Vehicle & Route
                    </p>
                  </div>

                  <div className="bg-accent/20 rounded-lg p-4 text-center">
                    <Clock className="h-8 w-8 text-accent mx-auto mb-2" />
                    <p className="text-sm text-primary-foreground/80">
                      Real-time Tracking
                    </p>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Safety Snapshot */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm">

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <span className="inline-flex rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                  Driver safety + logistics
                </span>

                <h2 className="mt-4 text-3xl font-bold tracking-tight">
                  Monitor driver alertness while tracking every delivery.
                </h2>

                <p className="mt-4 max-w-2xl text-base text-muted-foreground">
                  Keep drivers safe with live eye gesture monitoring and continue
                  delivery tracking in one unified workflow.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:w-[58%]">

                <div className="rounded-3xl border border-border bg-muted p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Driver Safety
                  </p>

                  <p className="mt-3 text-2xl font-semibold">
                    Active
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Real-time fatigue alerting and attention tracking for drivers
                    on the road.
                  </p>
                </div>

                <div className="rounded-3xl border border-border bg-muted p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Package Tracking
                  </p>

                  <p className="mt-3 text-2xl font-semibold">
                    Live
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Track delivery routes, ETA, and provider status together with
                    driver health.
                  </p>
                </div>

              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button variant="secondary" asChild>
                <Link href="/driver-safety">
                  Open driver safety
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href="/tracking">
                  View package tracking
                </Link>
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">

          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything You Need for Modern Logistics
            </h2>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform bridges the gap between delivery providers and
              customers with cutting-edge technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Provider Network */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Truck className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Provider Network</CardTitle>

                <CardDescription>
                  Connect with verified delivery providers in your area with
                  logistics capabilities
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Verified providers
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Real-time availability
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Competitive pricing
                  </li>

                </ul>
              </CardContent>
            </Card>

            {/* Secure Payments */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>

                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Shield className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Secure Payments</CardTitle>

                <CardDescription>
                  Integrated PayFast payment system for secure and fast
                  transactions
                </CardDescription>

              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    PayFast integration
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Escrow protection
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Instant settlements
                  </li>

                </ul>
              </CardContent>
            </Card>

            {/* Real-time Tracking */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>

                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <MapPin className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Real-time Tracking</CardTitle>

                <CardDescription>
                  Track your packages in real-time with GPS precision and
                  delivery updates
                </CardDescription>

              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    GPS tracking
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    SMS notifications
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Delivery proof
                  </li>

                </ul>
              </CardContent>
            </Card>

            {/* Driver Safety */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>

                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Eye className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Driver Safety</CardTitle>

                <CardDescription>
                  Monitor driver alertness with live eye gestures to reduce
                  fatigue and improve delivery safety.
                </CardDescription>

              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Real-time driver alerts
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Fatigue and blink detection
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Operational safety insights
                  </li>

                </ul>
              </CardContent>
            </Card>

            {/* Delivery Authentication */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>

                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Package className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Delivery Authentication</CardTitle>

                <CardDescription>
                  Verify deliveries with photo proof, signatures, and customer
                  confirmation
                </CardDescription>

              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Photo verification
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Digital signatures
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Customer confirmation
                  </li>

                </ul>
              </CardContent>
            </Card>

            {/* Customer Management */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>

                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Users className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Customer Management</CardTitle>

                <CardDescription>
                  Comprehensive customer portal for order management and
                  communication
                </CardDescription>

              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Order history
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Direct messaging
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Rating system
                  </li>

                </ul>
              </CardContent>
            </Card>

            {/* Business Intelligence */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>

                <div className="bg-accent/10 rounded-lg p-3 w-fit">
                  <Globe className="h-8 w-8 text-accent" />
                </div>

                <CardTitle>Business Intelligence</CardTitle>

                <CardDescription>
                  Analytics and insights to optimize your logistics operations
                </CardDescription>

              </CardHeader>

              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Performance metrics
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Route optimization
                  </li>

                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent" />
                    Cost analysis
                  </li>

                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-primary/90">
        <div className="container mx-auto px-4 text-center">

          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Logistics?
          </h2>

          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join businesses and individuals using LoggiConnect to streamline their
            delivery operations.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
              asChild
            >
              <Link href="/auth">
                Start Free Trial
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
              asChild
            >
              <Link href="/about">
                Learn More
              </Link>
            </Button>

          </div>
        </div>
      </section>

    </div>
  )
}
import Link from "next/link"
import { Header } from "@/components/layout/header"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { HelpCircle, Package, Shield, CreditCard, Eye, Truck } from "lucide-react"

const faqs = [
  {
    q: "How do I track my package?",
    a: "Enter your order number and the email used on the order at the tracking page to see real-time delivery updates, including the driver's live location when the trip is active.",
    icon: Package,
  },
  {
    q: "How are delivery providers verified?",
    a: "All providers must complete a compliance check including identity verification, vehicle documentation, and safety screening before they can accept deliveries on the platform.",
    icon: Shield,
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept card payments and cash on delivery through our secure PayFast integration. Payment is only released to the provider once the delivery is confirmed.",
    icon: CreditCard,
  },
  {
    q: "Is driver safety monitored?",
    a: "Yes. Our driver safety system monitors fatigue and attention in real time using live eye gesture tracking to keep drivers safe on the road.",
    icon: Eye,
  },
  {
    q: "What happens if my delivery is delayed?",
    a: "You can contact support directly from your order page, or open a support ticket. Our team will investigate and provide updates on your delivery status.",
    icon: Truck,
  },
  {
    q: "How do I become a delivery provider?",
    a: "Sign up as a provider, complete your profile and compliance documents, then start accepting delivery requests in your service area through the provider dashboard.",
    icon: HelpCircle,
  },
]

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90">
        <div className="absolute inset-0 bg-[url('/abstract-logistics-network-lines.jpg')] opacity-10" />

        <div className="relative container mx-auto px-4 py-24 lg:py-32 text-center">
          <span className="inline-flex rounded-full bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Help Center
          </span>
          <h1 className="mt-6 text-4xl lg:text-6xl font-bold text-primary-foreground text-balance">
            Frequently Asked Questions
          </h1>
          <p className="mt-6 text-xl text-primary-foreground/90 max-w-2xl mx-auto text-pretty">
            Everything you need to know about using LoggiConnect
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-2">
            <Accordion type="single" collapsible defaultValue="item-1">
              {faqs.map((faq, i) => {
                const Icon = faq.icon
                return (
                  <AccordionItem
                    key={i}
                    value={`item-${i + 1}`}
                    className="border border-border rounded-xl bg-background shadow-sm hover:shadow-md transition-shadow"
                  >
                    <AccordionTrigger className="flex items-center gap-3 text-base font-medium text-foreground">
                      <div className="bg-accent/10 rounded-lg p-2 w-8 h-8 flex items-center justify-center text-accent">
                        <Icon className="h-4 w-4" />
                      </div>
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pt-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="rounded-[2rem] border border-border bg-card p-8 lg:p-12 shadow-sm text-center">
            <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Our support team is ready to help. Reach out to us directly.
            </p>
            <Link
              href="mailto:hello@mail.loggiconnect.co.za"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <HelpCircle className="h-5 w-5" />
              hello@mail.loggiconnect.co.za
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

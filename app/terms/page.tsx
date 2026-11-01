import Link from "next/link"
import { Header } from "@/components/layout/header"
import { SUPPORT_EMAIL } from "@/lib/company"

export const metadata = {
  title: "Terms of Service | LogiConnect",
  description: "The terms that apply when you use the LogiConnect logistics marketplace.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
        <h1 className="mt-3 text-4xl font-bold">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective 26 October 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Agreement</h2>
            <p>
              These terms govern your use of LogiConnect. By creating an account or using the service, you agree to
              these terms and our <Link className="text-primary hover:underline" href="/privacy">Privacy Policy</Link>.
              If you do not agree, do not use the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. Accounts</h2>
            <p>
              You must provide accurate information, keep your account secure, and use the service only for lawful
              purposes. Provider accounts are subject to review and may require valid compliance documents before
              approval or before accepting deliveries. You are responsible for activity under your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Our role</h2>
            <p>
              LogiConnect is a marketplace that connects customers with independent delivery providers. Unless
              expressly stated otherwise, providers are independent contractors and are responsible for the
              delivery services they perform, including compliance with licensing, vehicle, insurance, and road
              safety requirements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Orders, pricing, and payment</h2>
            <p>
              Prices are calculated from the information supplied at checkout and confirmed before an order is
              placed. You are responsible for accurate addresses, package details, and contact information.
              Payment terms, including cash-on-delivery or online payment, are shown during checkout. Failed or
              reversed payments may result in suspension or recovery action.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Provider obligations</h2>
            <p>
              Providers must maintain valid licences, vehicle registration, insurance, and any required operating
              permits; keep their compliance records current; follow lawful instructions and safety rules; and
              never transport prohibited or hazardous goods. LogiConnect may pause order acceptance while required
              documents are missing, expired, or unverified.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">6. Prohibited goods</h2>
            <p>
              You may not use the service to transport illegal, dangerous, or restricted items, including weapons,
              narcotics, hazardous materials, live animals where not permitted, or goods you do not have the right
              to send. We may refuse, cancel, or report shipments that breach these terms or applicable law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">7. Tracking and location</h2>
            <p>
              Customers can track an order using the order number and the email address used on the order.
              Providers may share device location while a delivery is active. Do not use tracking data to harass,
              monitor, or endanger any person.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">8. Cancellations, delays, and liability</h2>
            <p>
              Delivery times are estimates and may be affected by traffic, weather, access, or events outside our
              control. Cancellation and refund handling depends on the stage of the order. To the extent permitted
              by law, LogiConnect is not liable for indirect or consequential loss, and our aggregate liability is
              limited to the amount paid for the affected order.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">9. Suspension and termination</h2>
            <p>
              We may suspend or terminate access for breaches of these terms, fraudulent or abusive conduct,
              safety risks, or failure to maintain required compliance documents. You may stop using the service at
              any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">10. Changes, law, and contact</h2>
            <p>
              We may update these terms as the service changes. Material changes will be reflected by the
              effective date above. These terms are governed by the laws of South Africa. Questions can be sent to{" "}
              <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

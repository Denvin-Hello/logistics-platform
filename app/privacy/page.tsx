import Link from "next/link"
import { Header } from "@/components/layout/header"
import { SUPPORT_EMAIL } from "@/lib/company"

export const metadata = {
  title: "Privacy Policy | LogiConnect",
  description: "How LogiConnect collects, uses, and protects personal information.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Legal</p>
        <h1 className="mt-3 text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Effective 26 October 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Who we are</h2>
            <p>
              LogiConnect operates a logistics marketplace that connects customers who need deliveries with
              independent delivery providers. This policy explains how we handle personal information when you use
              our website, applications, and services.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. Information we collect</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Account details such as your name, email address, phone number, role, and business details.</li>
              <li>Order details such as pickup and delivery addresses, contact details, package descriptions, and payment status.</li>
              <li>Location data shared by providers during an active delivery, and coordinates used to map pickup and delivery addresses.</li>
              <li>Compliance documents uploaded by providers, including licences, vehicle registration, insurance, and roadworthy certificates.</li>
              <li>Support messages, consent records, and technical information such as IP address and request logs.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. How we use information</h2>
            <p>
              We use personal information to create and secure accounts, match orders with providers, enable
              tracking and communication, process payments, verify provider compliance, prevent fraud and abuse,
              provide support, meet legal obligations, and improve the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Consent and legal grounds</h2>
            <p>
              We process personal information on the basis of your consent, the performance of our agreement with
              you, our legitimate interests in operating a safe marketplace, and applicable legal obligations. You
              may withdraw consent where processing relies on consent, but this may limit your ability to use parts
              of the service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Sharing information</h2>
            <p>
              We share the information needed to complete a delivery with the assigned provider and the customer,
              such as names, contact details, addresses, and delivery status. We also use service providers for
              hosting, email delivery, mapping, and payment processing. We do not sell personal information.
            </p>
            <p>
              Public tracking is restricted: a tracking number alone is not enough to view an order. Tracking
              requires the email address used on the order, and provider contact details are limited until the trip
              starts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">6. Retention and security</h2>
            <p>
              We keep personal information for as long as needed to provide the service, meet legal and accounting
              requirements, resolve disputes, and enforce our agreements. Compliance records may be retained for
              the period required to demonstrate regulatory compliance.
            </p>
            <p>
              We use access controls, rate limiting, same-origin checks, and private document storage. No system is
              completely secure, so please use a strong, unique email account and report suspected misuse promptly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">7. Your rights</h2>
            <p>
              Subject to applicable law, including the Protection of Personal Information Act, you may request
              access to, correction of, or deletion of your personal information, object to certain processing, and
              lodge a complaint with the Information Regulator. To exercise these rights, contact us using the
              details below.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">8. Cookies and local storage</h2>
            <p>
              We use cookies and local storage to keep you signed in, remember preferences, and protect forms
              against cross-site requests. You can control cookies in your browser, but disabling essential cookies
              may prevent sign-in.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">9. Changes and contact</h2>
            <p>
              We may update this policy as the service changes. Material changes will be reflected by the effective
              date above. Questions or requests can be sent to{" "}
              <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              . See also our <Link className="text-primary hover:underline" href="/terms">Terms of Service</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}

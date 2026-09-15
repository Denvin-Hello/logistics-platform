import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company */}
          <div>
            <div className="flex items-center mb-4">
              <Image
                src="/logo.jpg"
                alt="TDL CO"
                width={160}
                height={60}
                className="w-[160px] h-auto object-contain"
              />
            </div>
            <p className="text-muted-foreground">
              One Platform with Endless Possibilities
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {/* <li>
                <Link href="/customer" className="hover:text-accent">
                  For Customers
                </Link>
              </li>
              <li>
                <Link href="/provider" className="hover:text-accent">
                  For Providers
                </Link>
              </li> */}
              <li>
                <Link href="/tracking" className="hover:text-accent">
                  Package Tracking
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-accent">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Safety */}
          <div>
            <h3 className="font-semibold mb-4">Safety</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/driver-safety" className="hover:text-accent">
                  Driver Safety
                </Link>
              </li>
              {/* <li>
                <Link href="/about" className="hover:text-accent">
                  About Us
                </Link>
              </li> */}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-accent">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()}. LoggiConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

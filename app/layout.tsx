import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { ProviderToast } from '@/components/ui/provider-toast'
import { DevRoleSwitcher } from '@/components/dev/role-switcher'
import { Footer } from '@/components/layout/footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'LogiConnect',
  description: 'Streamlined logistics and delivery platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <ProviderToast />
        {process.env.NODE_ENV === "development" ? <DevRoleSwitcher /> : null}
        <Analytics />
      </body>
    </html>
  )
}

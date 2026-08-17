import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { ProviderToast } from '@/components/ui/provider-toast'
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
        {children}
        <ProviderToast />
        <Analytics />
      </body>
    </html>
  )
}

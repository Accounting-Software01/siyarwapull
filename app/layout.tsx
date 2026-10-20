import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'

import MobileBottomNav from '@/components/MobileBottomNav'
import DashboardHeader from '@/components/dashboard/layout/dashboard-header'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'
import { AuthGateProvider } from '@/contexts/AuthGateContext'
import './globals.css'

// geist/font ships the font files locally, so the build never depends on
// reaching fonts.googleapis.com — more reliable in CI/offline environments.

export const metadata: Metadata = {
  title: 'Siyarwa Pull (Beta) - Build Your Identity, Share Your World',
  description: 'Siyarwa Pull is where creators build a Face, forge portfolios, blogs, shops, and short videos, buy and sell on the marketplace, and get discovered through Spark.',
  generator: 'Pull Foward - Arham & Brothers Ltd',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Siyarwa Pull',
  },
  icons: {
    icon: [
      {
        url: '/pull-icon-maskable-512.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/pull-icon-maskable-512.png',
        media: '(prefers-color-scheme: dark)',
      },
      { url: '/pull-icon-maskable-512.png', sizes: '192x192', type: 'image/png' },
      { url: '/pull-icon-maskable-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/pull-icon-maskable-512.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`bg-background ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans antialiased">

        <AuthGateProvider>
          <div className="md:pb-0 pb-20">
            {children}
          </div>
          <DashboardHeader />
          <MobileBottomNav />
        </AuthGateProvider>
        <ServiceWorkerRegister />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

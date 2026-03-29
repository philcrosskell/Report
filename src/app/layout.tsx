import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BEAL Creative - Audit Machine — AI-powered SEO, GBP Audit & Competitor Analysis Tools',
  description: 'AI-powered Analysis dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

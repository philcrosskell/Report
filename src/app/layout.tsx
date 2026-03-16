import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Audit Machine — SEO & Landing Page Audit Dashboard',
  description: 'AI-powered SEO and landing page analysis dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

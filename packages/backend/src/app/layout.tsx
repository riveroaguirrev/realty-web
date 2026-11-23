import type { Metadata } from 'next'

// Every API response depends on the current request and session.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Realty API',
  description: 'Real estate platform backend API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

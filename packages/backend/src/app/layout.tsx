import type { Metadata } from 'next'

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

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { getPoints } from '@/lib/queries'
import { getUser } from '@/lib/session'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SwachhLens – Snap it. Report it. Clean it.',
  description: 'Report litter with a photo, let AI sort it, and help your neighbourhood get it cleaned up.',
}

export const dynamic = 'force-dynamic'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null)
  const points = user ? await getPoints(user.id).catch(() => 0) : 0

  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar user={user ? { name: user.name, isAdmin: user.isAdmin, points } : null} />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
          SwachhLens · Keep your city clean ·{' '}
          <Link href="/feedback" className="text-brand-700 hover:underline">
            Give feedback
          </Link>
        </footer>
      </body>
    </html>
  )
}

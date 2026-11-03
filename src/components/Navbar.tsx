'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Camera, LogOut, Menu, X } from 'lucide-react'
import { logout } from '@/app/actions/auth'

type Props = {
  user: { name: string; isAdmin: boolean; points: number } | null
}

export default function Navbar({ user }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const links = [
    { href: '/report', label: 'Report' },
    { href: '/collect', label: 'Collect' },
    { href: '/leaderboard', label: 'Leaderboard' },
    ...(user ? [{ href: '/profile', label: 'My activity' }] : []),
    ...(user?.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${
      pathname.startsWith(href) ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:text-stone-900'
    }`

  return (
    <header className="sticky top-0 z-[1000] border-b border-stone-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Camera size={18} />
          </span>
          SwachhLens
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass(l.href)}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                {user.points} pts
              </span>
              <span className="text-sm text-stone-600">{user.name}</span>
              <form action={logout}>
                <button className="btn-outline px-3 py-2" title="Log out">
                  <LogOut size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-outline">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-stone-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-stone-100 pt-3">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-600">
                  {user.name} · <b className="text-amber-700">{user.points} pts</b>
                </span>
                <form action={logout}>
                  <button className="btn-outline px-3 py-2">Log out</button>
                </form>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login" className="btn-outline flex-1" onClick={() => setOpen(false)}>
                  Log in
                </Link>
                <Link href="/register" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

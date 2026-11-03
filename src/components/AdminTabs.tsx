'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Download } from 'lucide-react'

const tabs = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/accuracy', label: 'AI accuracy' },
  { href: '/admin/survey', label: 'Survey results' },
]

export default function AdminTabs() {
  const pathname = usePathname()
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
      <nav className="flex gap-1">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              pathname === t.href ? 'bg-brand-50 text-brand-700' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="flex gap-2">
        <a href="/api/export/reports" className="btn-outline px-3 py-2">
          <Download size={14} /> Reports CSV
        </a>
        <a href="/api/export/feedback" className="btn-outline px-3 py-2">
          <Download size={14} /> Survey CSV
        </a>
      </div>
    </div>
  )
}

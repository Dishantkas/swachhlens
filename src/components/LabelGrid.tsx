'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { setVerifiedType } from '@/app/actions/admin'
import { capitalize, formatDate } from '@/lib/format'
import { NOT_WASTE, WASTE_TYPES } from '@/lib/waste'

type Item = {
  id: number
  aiType: string
  verifiedType: string | null
  confidence: number | null
  summary: string | null
  createdAt: string
}

const OPTIONS = [...WASTE_TYPES, NOT_WASTE]

export default function LabelGrid({ items }: { items: Item[] }) {
  const [labels, setLabels] = useState<Record<number, string | null>>(
    Object.fromEntries(items.map((i) => [i.id, i.verifiedType]))
  )
  const [saving, setSaving] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function save(id: number, value: string | null) {
    setSaving(id)
    setError('')
    const previous = labels[id]
    setLabels((l) => ({ ...l, [id]: value }))
    const res = await setVerifiedType(id, value).catch(() => ({ ok: false as const, error: 'Network problem.' }))
    setSaving(null)
    if (!res.ok) {
      setLabels((l) => ({ ...l, [id]: previous }))
      setError(res.error)
    }
  }

  if (items.length === 0) return <div className="card text-center text-stone-500">No reports to check yet.</div>

  return (
    <div>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const label = labels[item.id]
          const correct = label ? label === item.aiType : null
          return (
            <div
              key={item.id}
              className={`card p-3 ${correct === true ? 'ring-2 ring-brand-300' : correct === false ? 'ring-2 ring-red-200' : ''}`}
            >
              <img src={`/api/photo/${item.id}?any=1`} alt="" className="aspect-video w-full rounded-lg object-cover" loading="lazy" />
              <div className="mt-3 flex items-center justify-between text-sm">
                <span>
                  AI said <b>{capitalize(item.aiType)}</b>
                  {item.confidence !== null && <span className="text-stone-400"> · {Math.round(item.confidence * 100)}%</span>}
                </span>
                {correct === true && <Check size={18} className="text-brand-600" />}
                {correct === false && <X size={18} className="text-red-500" />}
              </div>
              {item.summary && <p className="mt-1 line-clamp-2 text-xs text-stone-500">{item.summary}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => save(item.id, item.aiType)}
                  disabled={saving === item.id}
                  className="btn-outline flex-1 px-2 py-1.5"
                >
                  AI is right
                </button>
                <select
                  className="input flex-1 py-1.5"
                  value={label ?? ''}
                  disabled={saving === item.id}
                  onChange={(e) => save(item.id, e.target.value || null)}
                >
                  <option value="">Actual type…</option>
                  {OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o === NOT_WASTE ? 'Not waste' : capitalize(o)}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-stone-400">
                #{item.id} · {formatDate(item.createdAt)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

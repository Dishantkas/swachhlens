'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, MapPin, Navigation, Scale, XCircle } from 'lucide-react'
import { claimReport, completeCollection, releaseReport } from '@/app/actions/collect'
import { getPosition } from '@/lib/compress'
import { WASTE_COLORS, capitalize, formatDate } from '@/lib/format'
import type { ReportItem } from '@/lib/queries'
import MapView from './MapView'
import PhotoInput from './PhotoInput'
import { HazardBadge } from './StatusBadge'

type Props = {
  open: ReportItem[]
  mine: ReportItem[]
  userId: number | null
}

type Outcome = { passed: boolean; points: number; note: string }

export default function CollectBoard({ open, mine, userId }: Props) {
  const router = useRouter()
  const [focus, setFocus] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [active, setActive] = useState<ReportItem | null>(null)

  const points = useMemo(
    () =>
      open.map((r) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        color: WASTE_COLORS[r.wasteType],
        popup: `${capitalize(r.wasteType)} · ~${r.weightKg} kg${r.landmark ? ` · ${r.landmark}` : ''}`,
      })),
    [open]
  )
  const focused = useMemo(() => open.find((r) => r.id === focus) ?? null, [open, focus])

  async function claim(id: number) {
    if (!userId) {
      router.push('/login?next=/collect')
      return
    }
    setBusyId(id)
    setError('')
    const res = await claimReport(id)
    setBusyId(null)
    if (!res.ok) setError(res.error)
    router.refresh()
  }

  async function release(id: number) {
    setBusyId(id)
    await releaseReport(id)
    setBusyId(null)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Your pick-ups</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((r) => (
              <div key={r.id} className="card border-sky-200">
                <ReportSummary report={r} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => setActive(r)} className="btn-primary">
                    <CheckCircle2 size={16} /> Mark as cleaned
                  </button>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline"
                  >
                    <Navigation size={16} /> Directions
                  </a>
                  <button onClick={() => release(r.id)} disabled={busyId === r.id} className="btn-outline">
                    Give up
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Waiting for pick-up</h2>
          <span className="text-sm text-stone-500">{open.length} spots</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MapView
              points={points}
              selected={focused}
              onPointClick={setFocus}
              className="h-[420px]"
            />
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 lg:col-span-2">
            {open.length === 0 && (
              <div className="card text-center text-stone-500">Nothing to collect right now. Great job, everyone!</div>
            )}
            {open.map((r) => (
              <div
                key={r.id}
                className={`card cursor-pointer p-4 transition ${focus === r.id ? 'ring-2 ring-brand-400' : ''}`}
                onClick={() => setFocus(r.id)}
              >
                <ReportSummary report={r} compact />
                <div className="mt-3 flex gap-2">
                  {r.reporterId === userId ? (
                    <span className="text-xs text-stone-500">You reported this</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        claim(r.id)
                      }}
                      disabled={busyId === r.id}
                      className="btn-primary px-3 py-1.5"
                    >
                      {busyId === r.id && <Loader2 className="animate-spin" size={14} />}
                      I&apos;ll pick it up
                    </button>
                  )}
                  <Link
                    href={`/reports/${r.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="btn-outline px-3 py-1.5"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {active && (
        <CompleteDialog
          report={active}
          onClose={(changed) => {
            setActive(null)
            if (changed) router.refresh()
          }}
        />
      )}
    </div>
  )
}

function ReportSummary({ report, compact }: { report: ReportItem; compact?: boolean }) {
  return (
    <div className="flex gap-3">
      <img
        src={`/api/photo/${report.id}`}
        alt=""
        className={`${compact ? 'h-16 w-16' : 'h-20 w-20'} shrink-0 rounded-lg object-cover`}
        loading="lazy"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{capitalize(report.wasteType)}</span>
          <span className="flex items-center gap-1 text-sm text-stone-500">
            <Scale size={14} /> ~{report.weightKg} kg
          </span>
          <HazardBadge hazard={report.hazard} />
        </div>
        <p className="mt-1 flex items-start gap-1 text-sm text-stone-600">
          <MapPin size={14} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{report.landmark || report.address || 'Location pinned on map'}</span>
        </p>
        <p className="mt-1 text-xs text-stone-400">
          Reported {formatDate(report.createdAt)} by {report.reporterName}
        </p>
      </div>
    </div>
  )
}

function CompleteDialog({ report, onClose }: { report: ReportItem; onClose: (changed: boolean) => void }) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  async function verify() {
    if (!photo) return
    setBusy(true)
    setError('')

    let position: { lat: number; lng: number } | null = null
    try {
      position = await getPosition()
    } catch {
      position = null
    }

    const res = await completeCollection({
      reportId: report.id,
      photo,
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
    }).catch(() => ({ ok: false as const, error: 'Network problem. Please try again.' }))
    setBusy(false)

    if (!res.ok) {
      setError(res.error)
      return
    }
    setOutcome({ passed: res.data.passed, points: res.data.points, note: res.data.check.note })
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6">
        <h3 className="text-lg font-semibold">Confirm the clean-up</h3>
        <p className="mt-1 text-sm text-stone-600">
          Take a photo of the same spot after picking up the waste. Our AI compares it with the original report.
        </p>

        {outcome ? (
          <div className={`mt-5 rounded-xl p-4 ${outcome.passed ? 'bg-brand-50' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 font-semibold">
              {outcome.passed ? (
                <>
                  <CheckCircle2 className="text-brand-600" /> Verified! +{outcome.points} points
                </>
              ) : (
                <>
                  <XCircle className="text-red-600" /> Not verified yet
                </>
              )}
            </div>
            {outcome.note && <p className="mt-1 text-sm text-stone-700">{outcome.note}</p>}
            {outcome.passed && (
              <p className="mt-2 text-sm text-stone-600">
                Got 2 minutes?{' '}
                <Link href="/feedback" className="font-medium text-brand-700 hover:underline">
                  Tell us how it went
                </Link>
              </p>
            )}
            {!outcome.passed && (
              <p className="mt-2 text-sm text-stone-600">
                Make sure the photo shows the same place and that the waste is gone, then try again.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Before</p>
              <img src={`/api/photo/${report.id}`} alt="Reported waste" className="h-44 w-full rounded-xl object-cover" />
            </div>
            <div>
              <p className="label">After</p>
              <PhotoInput value={photo} onChange={setPhoto} label="Photo after clean-up" disabled={busy} />
            </div>
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          {outcome?.passed ? (
            <button onClick={() => onClose(true)} className="btn-primary">
              Done
            </button>
          ) : (
            <>
              <button onClick={() => onClose(false)} className="btn-outline" disabled={busy}>
                Cancel
              </button>
              {outcome ? (
                <button
                  onClick={() => {
                    setOutcome(null)
                    setPhoto(null)
                  }}
                  className="btn-primary"
                >
                  Try another photo
                </button>
              ) : (
                <button onClick={verify} disabled={!photo || busy} className="btn-primary">
                  {busy && <Loader2 className="animate-spin" size={16} />}
                  {busy ? 'Checking…' : 'Verify clean-up'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

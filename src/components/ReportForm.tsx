'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Loader2, LocateFixed, MapPin, Sparkles } from 'lucide-react'
import { analyzeReport, findAddress, submitReport } from '@/app/actions/reports'
import { getPosition } from '@/lib/compress'
import { capitalize } from '@/lib/format'
import { WASTE_TYPES } from '@/lib/waste'
import MapView from './MapView'
import PhotoInput from './PhotoInput'
import { HazardBadge } from './StatusBadge'

type Analysis = {
  wasteType: string
  weightKg: number
  hazard: string
  summary: string
  confidence: number
}

type Spot = { lat: number; lng: number }

export default function ReportForm() {
  const [photo, setPhoto] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [ticket, setTicket] = useState<string | null>(null)
  const [spot, setSpot] = useState<Spot | null>(null)
  const [address, setAddress] = useState('')
  const [landmark, setLandmark] = useState('')
  const [busy, setBusy] = useState<'analyse' | 'locate' | 'submit' | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ id: number; points: number } | null>(null)
  const [manual, setManual] = useState<{ wasteType: string; weightKg: string; hazard: string } | null>(null)

  function changePhoto(value: string | null) {
    setPhoto(value)
    setAnalysis(null)
    setTicket(null)
    setManual(null)
    setError('')
  }

  async function analyse() {
    if (!photo) return
    setBusy('analyse')
    setError('')
    const res = await analyzeReport(photo).catch(() => ({ ok: false as const, error: 'Network problem. Please try again.' }))
    setBusy(null)
    if (!res?.ok) {
      setError(res?.error ?? 'Something went wrong. Please try again.')
      return
    }
    setTicket(res.data.ticket)
    if (res.data.mode === 'ai') {
      setAnalysis(res.data.analysis)
    } else {
      setManual({ wasteType: '', weightKg: '', hazard: 'low' })
    }
  }

  const manualReady = manual !== null && manual.wasteType !== '' && Number(manual.weightKg) > 0
  const canSubmit = Boolean(ticket && spot && (analysis || manualReady))

  async function pickSpot(lat: number, lng: number) {
    setSpot({ lat, lng })
    setAddress('Looking up address…')
    const res = await findAddress(lat, lng)
    setAddress(res.ok ? res.data : `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
  }

  async function useMyLocation() {
    setBusy('locate')
    setError('')
    try {
      const pos = await getPosition()
      await pickSpot(pos.lat, pos.lng)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get your location.')
    } finally {
      setBusy(null)
    }
  }

  async function submit() {
    if (!photo || !ticket || !spot || !canSubmit) return
    setBusy('submit')
    setError('')
    const res = await submitReport({
      photo,
      ticket,
      lat: spot.lat,
      lng: spot.lng,
      address,
      landmark,
      manual: manual ? { wasteType: manual.wasteType, weightKg: Number(manual.weightKg), hazard: manual.hazard } : undefined,
    }).catch(() => ({
      ok: false as const,
      error: 'Network problem. Please try again.',
    }))
    setBusy(null)
    if (!res?.ok) {
      setError(res?.error ?? 'Something went wrong. Please try again.')
      return
    }
    setDone(res.data)
  }

  function reset() {
    changePhoto(null)
    setSpot(null)
    setAddress('')
    setLandmark('')
    setDone(null)
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto text-brand-600" size={48} />
        <h2 className="mt-3 text-xl font-semibold">Report sent!</h2>
        <p className="mt-1 text-stone-600">
          Thanks for helping. You earned <b className="text-amber-700">{done.points} points</b>. Collectors nearby can
          now see this spot.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/reports/${done.id}`} className="btn-outline">
            View report
          </Link>
          <button onClick={reset} className="btn-primary">
            Report another
          </button>
        </div>
        <p className="mt-5 text-sm text-stone-600">
          Got 2 minutes?{' '}
          <Link href="/feedback" className="font-medium text-brand-700 hover:underline">
            Tell us how it went
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4">
        <h2 className="font-semibold">1. Photo of the waste</h2>
        <PhotoInput value={photo} onChange={changePhoto} disabled={busy !== null} />

        {photo && !analysis && !manual && (
          <button onClick={analyse} disabled={busy !== null} className="btn-primary w-full">
            {busy === 'analyse' ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {busy === 'analyse' ? 'Analysing photo…' : 'Analyse with AI'}
          </button>
        )}

        {analysis && (
          <div className="rounded-xl bg-brand-50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-brand-800">{capitalize(analysis.wasteType)}</span>
              <span className="text-sm text-brand-700">~{analysis.weightKg} kg</span>
              <HazardBadge hazard={analysis.hazard} />
            </div>
            {analysis.summary && <p className="mt-1 text-sm text-stone-700">{analysis.summary}</p>}
            <p className="mt-2 text-xs text-stone-500">AI confidence {Math.round(analysis.confidence * 100)}%</p>
          </div>
        )}

        {manual && (
          <div className="space-y-3 rounded-xl bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              The AI is busy right now, so please fill in the details yourself. An admin may review this report.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="m-type">
                  Waste type
                </label>
                <select
                  id="m-type"
                  className="input"
                  value={manual.wasteType}
                  onChange={(e) => setManual({ ...manual, wasteType: e.target.value })}
                >
                  <option value="">Choose…</option>
                  {WASTE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {capitalize(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="m-weight">
                  Approx. weight (kg)
                </label>
                <input
                  id="m-weight"
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  className="input"
                  value={manual.weightKg}
                  onChange={(e) => setManual({ ...manual, weightKg: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="m-hazard">
                  Hazard
                </label>
                <select
                  id="m-hazard"
                  className="input"
                  value={manual.hazard}
                  onChange={(e) => setManual({ ...manual, hazard: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (glass, medical, chemical)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">2. Where is it?</h2>
        <button onClick={useMyLocation} disabled={busy !== null} className="btn-outline w-full">
          {busy === 'locate' ? <Loader2 className="animate-spin" size={16} /> : <LocateFixed size={16} />}
          Use my current location
        </button>
        <p className="text-center text-xs text-stone-500">or tap the map to drop a pin</p>
        <MapView selected={spot} onPick={pickSpot} className="h-64" />

        {spot && (
          <p className="flex items-start gap-2 text-sm text-stone-600">
            <MapPin size={16} className="mt-0.5 shrink-0 text-red-600" />
            {address}
          </p>
        )}

        <div>
          <label className="label" htmlFor="landmark">
            Nearby landmark (optional)
          </label>
          <input
            id="landmark"
            className="input"
            placeholder="e.g. behind the bus stop, near Sharma General Store"
            value={landmark}
            maxLength={120}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>
      </section>

      <div className="lg:col-span-2">
        {error && <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button onClick={submit} disabled={!canSubmit || busy !== null} className="btn-primary w-full py-3 text-base">
          {busy === 'submit' && <Loader2 className="animate-spin" size={18} />}
          Submit report
        </button>
        {!canSubmit && (
          <p className="mt-2 text-center text-xs text-stone-500">Analyse a photo and set the location to submit.</p>
        )}
      </div>
    </div>
  )
}

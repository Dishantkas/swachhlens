'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { submitFeedback } from '@/app/actions/feedback'
import {
  AGE_GROUPS,
  EXTRA_ITEMS,
  LIKERT,
  OCCUPATIONS,
  PRIOR_METHODS,
  SUS_ITEMS,
  type ExtraKey,
  type SurveyAnswers,
} from '@/lib/survey'

const empty: SurveyAnswers = {
  ageGroup: '',
  occupation: '',
  priorMethod: '',
  sus: Array(10).fill(0),
  ease: 0,
  aiTrust: 0,
  motivation: 0,
  recommend: 0,
  comments: '',
}

export default function SurveyForm({ initial }: { initial: SurveyAnswers | null }) {
  const [answers, setAnswers] = useState<SurveyAnswers>(initial ?? empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const setSus = (index: number, value: number) =>
    setAnswers((a) => ({ ...a, sus: a.sus.map((v, i) => (i === index ? value : v)) }))
  const setExtra = (key: ExtraKey, value: number) => setAnswers((a) => ({ ...a, [key]: value }))

  const complete =
    answers.ageGroup &&
    answers.occupation &&
    answers.priorMethod &&
    answers.sus.every((v) => v > 0) &&
    EXTRA_ITEMS.every((item) => answers[item.key] > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!complete) {
      setError('Please answer every question before submitting.')
      return
    }
    setBusy(true)
    setError('')
    const res = await submitFeedback(answers).catch(() => ({ ok: false as const, error: 'Network problem. Please try again.' }))
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (done) {
    return (
      <div className="card mx-auto max-w-lg text-center">
        <CheckCircle2 className="mx-auto text-brand-600" size={48} />
        <h2 className="mt-3 text-xl font-semibold">Thank you!</h2>
        <p className="mt-1 text-stone-600">Your answers help us measure and improve SwachhLens.</p>
        <Link href="/" className="btn-primary mt-5">
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card grid gap-4 md:grid-cols-3">
        <Select label="Age group" value={answers.ageGroup} options={AGE_GROUPS} onChange={(v) => setAnswers((a) => ({ ...a, ageGroup: v }))} />
        <Select label="Occupation" value={answers.occupation} options={OCCUPATIONS} onChange={(v) => setAnswers((a) => ({ ...a, occupation: v }))} />
        <Select
          label="Before SwachhLens, how did you usually report waste?"
          value={answers.priorMethod}
          options={PRIOR_METHODS}
          onChange={(v) => setAnswers((a) => ({ ...a, priorMethod: v }))}
        />
      </section>

      <section className="card">
        <h2 className="font-semibold">Part A: Using the website</h2>
        <p className="mb-4 text-sm text-stone-500">How much do you agree with each statement?</p>
        <div className="divide-y divide-stone-100">
          {SUS_ITEMS.map((text, i) => (
            <LikertRow key={i} number={i + 1} text={text} value={answers.sus[i]} onChange={(v) => setSus(i, v)} />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Part B: About SwachhLens</h2>
        <div className="mt-2 divide-y divide-stone-100">
          {EXTRA_ITEMS.map((item, i) => (
            <LikertRow
              key={item.key}
              number={11 + i}
              text={item.text}
              value={answers[item.key]}
              onChange={(v) => setExtra(item.key, v)}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <label className="label" htmlFor="comments">
          Any suggestions? (optional)
        </label>
        <textarea
          id="comments"
          rows={3}
          maxLength={1000}
          className="input"
          value={answers.comments}
          onChange={(e) => setAnswers((a) => ({ ...a, comments: e.target.value }))}
        />
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
        {busy && <Loader2 className="animate-spin" size={18} />}
        {initial ? 'Update my answers' : 'Submit survey'}
      </button>
    </form>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function LikertRow({
  number,
  text,
  value,
  onChange,
}: {
  number: number
  text: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="py-4">
      <p className="text-sm font-medium text-stone-800">
        {number}. {text}
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {LIKERT.map((label, i) => {
          const score = i + 1
          const selected = value === score
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(score)}
              className={`rounded-lg border px-1 py-2 text-center text-xs transition ${
                selected
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-stone-200 bg-white text-stone-600 hover:border-brand-300'
              }`}
            >
              <span className="block text-sm font-semibold">{score}</span>
              <span className="hidden sm:block">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

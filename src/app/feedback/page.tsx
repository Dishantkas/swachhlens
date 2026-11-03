import { redirect } from 'next/navigation'
import SurveyForm from '@/components/SurveyForm'
import { db } from '@/lib/db'
import { getUser } from '@/lib/session'
import type { SurveyAnswers } from '@/lib/survey'

export default async function FeedbackPage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/feedback')

  const sql = await db()
  const [row] = await sql`SELECT * FROM feedback WHERE user_id = ${user.id}`
  const initial: SurveyAnswers | null = row
    ? {
        ageGroup: row.age_group ?? '',
        occupation: row.occupation ?? '',
        priorMethod: row.prior_method ?? '',
        sus: [row.s1, row.s2, row.s3, row.s4, row.s5, row.s6, row.s7, row.s8, row.s9, row.s10],
        ease: row.ease,
        aiTrust: row.ai_trust,
        motivation: row.motivation,
        recommend: row.recommend,
        comments: row.comments ?? '',
      }
    : null

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">SwachhLens feedback survey</h1>
      <p className="mb-6 mt-1 text-stone-600">
        Takes about 2 minutes. Your answers are used anonymously to evaluate how useful and easy SwachhLens is.
      </p>
      {initial && (
        <p className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          You have already filled in this survey. You can change your answers below.
        </p>
      )}
      <SurveyForm initial={initial} />
    </div>
  )
}

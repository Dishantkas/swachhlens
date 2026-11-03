'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { attempt, UserError } from '@/lib/errors'
import { requireUser } from '@/lib/session'
import { susScore } from '@/lib/stats'
import { AGE_GROUPS, OCCUPATIONS, PRIOR_METHODS, type SurveyAnswers } from '@/lib/survey'

function likert(value: unknown) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new UserError('Please answer every question.')
  return n
}

function pick(value: unknown, options: string[]) {
  const text = String(value ?? '')
  if (!options.includes(text)) throw new UserError('Please answer every question.')
  return text
}

export async function submitFeedback(input: SurveyAnswers) {
  return attempt(async () => {
    const user = await requireUser()

    const ageGroup = pick(input?.ageGroup, AGE_GROUPS)
    const occupation = pick(input?.occupation, OCCUPATIONS)
    const priorMethod = pick(input?.priorMethod, PRIOR_METHODS)
    if (!Array.isArray(input.sus) || input.sus.length !== 10) throw new UserError('Please answer every question.')
    const sus = input.sus.map(likert)
    const ease = likert(input.ease)
    const aiTrust = likert(input.aiTrust)
    const motivation = likert(input.motivation)
    const recommend = likert(input.recommend)
    const comments = String(input.comments ?? '').trim().slice(0, 1000) || null
    const score = susScore(sus)

    const sql = await db()
    await sql`
      INSERT INTO feedback (user_id, age_group, occupation, prior_method,
                            s1, s2, s3, s4, s5, s6, s7, s8, s9, s10,
                            sus_score, ease, ai_trust, motivation, recommend, comments)
      VALUES (${user.id}, ${ageGroup}, ${occupation}, ${priorMethod},
              ${sus[0]}, ${sus[1]}, ${sus[2]}, ${sus[3]}, ${sus[4]},
              ${sus[5]}, ${sus[6]}, ${sus[7]}, ${sus[8]}, ${sus[9]},
              ${score}, ${ease}, ${aiTrust}, ${motivation}, ${recommend}, ${comments})
      ON CONFLICT (user_id) DO UPDATE SET
        age_group = EXCLUDED.age_group, occupation = EXCLUDED.occupation, prior_method = EXCLUDED.prior_method,
        s1 = EXCLUDED.s1, s2 = EXCLUDED.s2, s3 = EXCLUDED.s3, s4 = EXCLUDED.s4, s5 = EXCLUDED.s5,
        s6 = EXCLUDED.s6, s7 = EXCLUDED.s7, s8 = EXCLUDED.s8, s9 = EXCLUDED.s9, s10 = EXCLUDED.s10,
        sus_score = EXCLUDED.sus_score, ease = EXCLUDED.ease, ai_trust = EXCLUDED.ai_trust,
        motivation = EXCLUDED.motivation, recommend = EXCLUDED.recommend, comments = EXCLUDED.comments,
        updated_at = now()`

    revalidatePath('/admin/survey')
    return null
  })
}

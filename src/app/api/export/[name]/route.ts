import { db, iso } from '@/lib/db'
import { getUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

function toCsv(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const text = value instanceof Date ? value.toISOString() : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\r\n')
}

export async function GET(_request: Request, { params }: { params: { name: string } }) {
  const user = await getUser()
  if (!user?.isAdmin) return new Response('Not found', { status: 404 })

  const sql = await db()
  let rows: Record<string, unknown>[]
  let columns: string[]

  if (params.name === 'reports') {
    rows = await sql`
      SELECT id, created_at, reporter_id, ai_checked, waste_type, verified_type,
             CASE WHEN verified_type IS NULL OR NOT ai_checked THEN NULL ELSE (verified_type = waste_type) END AS ai_correct,
             est_weight_kg, hazard, confidence, status, lat, lng, address, landmark,
             collector_id, claimed_at, collected_at,
             round((extract(epoch FROM collected_at - created_at) / 3600)::numeric, 2) AS hours_to_clean
      FROM reports
      ORDER BY id`
    columns = [
      'id', 'created_at', 'reporter_id', 'ai_checked', 'waste_type', 'verified_type', 'ai_correct', 'est_weight_kg', 'hazard',
      'confidence', 'status', 'lat', 'lng', 'address', 'landmark', 'collector_id', 'claimed_at', 'collected_at',
      'hours_to_clean',
    ]
  } else if (params.name === 'feedback') {
    rows = await sql`
      SELECT id AS response_id, created_at, age_group, occupation, prior_method,
             s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, sus_score, ease, ai_trust, motivation, recommend, comments
      FROM feedback
      ORDER BY id`
    columns = [
      'response_id', 'created_at', 'age_group', 'occupation', 'prior_method',
      's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'sus_score',
      'ease', 'ai_trust', 'motivation', 'recommend', 'comments',
    ]
  } else {
    return new Response('Not found', { status: 404 })
  }

  for (const r of rows) {
    for (const key of ['created_at', 'claimed_at', 'collected_at']) {
      if (key in r) r[key] = iso(r[key])
    }
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response('﻿' + toCsv(rows, columns), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="swachhlens-${params.name}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}

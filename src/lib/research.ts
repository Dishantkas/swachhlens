import 'server-only'
import { db, iso } from './db'
import { binomialTest, mean, oneSampleTTest, stdDev } from './stats'
import { EXTRA_ITEMS } from './survey'
import { NOT_WASTE, WASTE_TYPES } from './waste'

export const ACCURACY_TARGET = 0.8
export const SUS_BENCHMARK = 68
export const LIKERT_NEUTRAL = 3

export type LabelItem = {
  id: number
  aiType: string
  verifiedType: string | null
  confidence: number | null
  summary: string | null
  status: string
  createdAt: string
}

export async function getLabelQueue(): Promise<LabelItem[]> {
  const sql = await db()
  const rows = await sql`
    SELECT id, waste_type, verified_type, confidence, summary, status, created_at
    FROM reports
    ORDER BY (verified_type IS NULL) DESC, created_at DESC
    LIMIT 200`
  return rows.map((r) => ({
    id: r.id,
    aiType: r.waste_type,
    verifiedType: r.verified_type,
    confidence: r.confidence === null ? null : Number(r.confidence),
    summary: r.summary,
    status: r.status,
    createdAt: iso(r.created_at) ?? '',
  }))
}

export async function getAccuracy() {
  const sql = await db()
  const rows = await sql`SELECT waste_type, verified_type FROM reports WHERE verified_type IS NOT NULL`
  const classes: string[] = [...WASTE_TYPES, NOT_WASTE]

  // matrix[actual][predicted]
  const matrix: Record<string, Record<string, number>> = {}
  for (const a of classes) matrix[a] = Object.fromEntries(classes.map((p) => [p, 0]))

  let correct = 0
  for (const r of rows) {
    const actual = classes.includes(r.verified_type) ? r.verified_type : 'mixed'
    const predicted = classes.includes(r.waste_type) ? r.waste_type : 'mixed'
    matrix[actual][predicted] += 1
    if (actual === predicted) correct += 1
  }

  const perClass = classes
    .map((c) => {
      const tp = matrix[c][c]
      const actualTotal = classes.reduce((sum, p) => sum + matrix[c][p], 0)
      const predictedTotal = classes.reduce((sum, a) => sum + matrix[a][c], 0)
      const precision = predictedTotal ? tp / predictedTotal : null
      const recall = actualTotal ? tp / actualTotal : null
      const f1 = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null
      return { label: c, support: actualTotal, predicted: predictedTotal, precision, recall, f1 }
    })
    .filter((c) => c.support > 0 || c.predicted > 0)

  const used = classes.filter((c) => perClass.some((p) => p.label === c))

  return {
    total: rows.length,
    correct,
    accuracy: rows.length ? correct / rows.length : 0,
    test: binomialTest(correct, rows.length, ACCURACY_TARGET),
    matrix,
    classes: used,
    perClass,
  }
}

export async function getSurveyResults() {
  const sql = await db()
  const rows = await sql`SELECT * FROM feedback ORDER BY created_at`

  const sus = rows.map((r) => Number(r.sus_score))
  const items = EXTRA_ITEMS.map((item) => {
    const column = item.key === 'aiTrust' ? 'ai_trust' : item.key
    const values = rows.map((r) => Number(r[column]))
    return {
      key: item.key,
      text: item.text,
      short: item.short,
      mean: mean(values),
      sd: stdDev(values),
      distribution: [1, 2, 3, 4, 5].map((v) => values.filter((x) => x === v).length),
      test: oneSampleTTest(values, LIKERT_NEUTRAL),
    }
  })

  const susItems = Array.from({ length: 10 }, (_, i) => mean(rows.map((r) => Number(r[`s${i + 1}`]))))

  const countBy = (column: string) => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const key = (r[column] as string | null) ?? 'Not given'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }

  return {
    n: rows.length,
    sus: {
      mean: mean(sus),
      sd: stdDev(sus),
      min: sus.length ? Math.min(...sus) : 0,
      max: sus.length ? Math.max(...sus) : 0,
      test: oneSampleTTest(sus, SUS_BENCHMARK),
      itemMeans: susItems,
    },
    items,
    ageGroups: countBy('age_group'),
    occupations: countBy('occupation'),
    priorMethods: countBy('prior_method'),
    comments: rows
      .filter((r) => r.comments)
      .map((r) => ({ id: r.id as number, text: r.comments as string, createdAt: iso(r.created_at) ?? '' })),
  }
}

export async function getHotspots() {
  const sql = await db()
  const rows = await sql`
    SELECT round(lat::numeric, 2)::float AS lat, round(lng::numeric, 2)::float AS lng,
           count(*)::int AS reports,
           count(*) FILTER (WHERE status = 'collected')::int AS cleaned,
           coalesce(sum(est_weight_kg), 0)::float AS kg,
           min(coalesce(landmark, address)) AS place
    FROM reports
    WHERE status <> 'rejected'
    GROUP BY 1, 2
    ORDER BY reports DESC, kg DESC
    LIMIT 15`
  return rows.map((r) => ({
    lat: Number(r.lat),
    lng: Number(r.lng),
    reports: r.reports as number,
    cleaned: r.cleaned as number,
    kg: Math.round(Number(r.kg) * 10) / 10,
    place: (r.place as string | null) ?? `${Number(r.lat).toFixed(2)}, ${Number(r.lng).toFixed(2)}`,
  }))
}

export async function getCleanupTimes() {
  const sql = await db()
  const [row] = await sql`
    SELECT
      avg(extract(epoch FROM collected_at - created_at) / 3600)::float AS avg_hours,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM collected_at - created_at) / 3600)::float AS median_hours,
      count(*)::int AS n
    FROM reports
    WHERE status = 'collected' AND collected_at IS NOT NULL`
  return {
    n: row.n as number,
    avgHours: row.avg_hours === null ? null : Number(row.avg_hours),
    medianHours: row.median_hours === null ? null : Number(row.median_hours),
  }
}

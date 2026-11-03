import 'server-only'
import { db, iso } from './db'
import { CLAIM_HOURS } from './points'

export type ReportStatus = 'pending' | 'claimed' | 'collected' | 'rejected'

export type ReportItem = {
  id: number
  wasteType: string
  weightKg: number
  hazard: string
  summary: string | null
  lat: number
  lng: number
  address: string | null
  landmark: string | null
  status: ReportStatus
  reporterId: number
  reporterName: string
  collectorId: number | null
  collectorName: string | null
  createdAt: string
  claimedAt: string | null
  collectedAt: string | null
  collectionNote: string | null
}

// Claims that were never finished go back to the open pool after CLAIM_HOURS.
const STATUS_SQL = `CASE WHEN r.status = 'claimed' AND r.claimed_at < now() - interval '${CLAIM_HOURS} hours' THEN 'pending' ELSE r.status END`

function toReport(row: Record<string, any>): ReportItem {
  return {
    id: row.id,
    wasteType: row.waste_type,
    weightKg: Number(row.est_weight_kg),
    hazard: row.hazard,
    summary: row.summary,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address,
    landmark: row.landmark,
    status: row.status,
    reporterId: row.reporter_id,
    reporterName: row.reporter_name,
    collectorId: row.status === 'pending' ? null : row.collector_id,
    collectorName: row.status === 'pending' ? null : row.collector_name,
    createdAt: iso(row.created_at) ?? '',
    claimedAt: iso(row.claimed_at),
    collectedAt: iso(row.collected_at),
    collectionNote: row.collection_note,
  }
}

async function selectReports(where: string, params: unknown[], limit = 100) {
  const sql = await db()
  const rows = await sql(
    `SELECT r.id, r.waste_type, r.est_weight_kg, r.hazard, r.summary, r.lat, r.lng, r.address, r.landmark,
            ${STATUS_SQL} AS status, r.reporter_id, r.collector_id, r.created_at, r.claimed_at,
            r.collected_at, r.collection_note, u.name AS reporter_name, c.name AS collector_name
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       LEFT JOIN users c ON c.id = r.collector_id
      WHERE ${where}
      ORDER BY r.created_at DESC
      LIMIT ${Math.floor(limit)}`,
    params
  )
  return rows.map(toReport)
}

export function getOpenReports() {
  return selectReports(`${STATUS_SQL} = 'pending'`, [])
}

export function getClaimedBy(userId: number) {
  return selectReports(`${STATUS_SQL} = 'claimed' AND r.collector_id = $1`, [userId])
}

export function getReportsBy(userId: number) {
  return selectReports('r.reporter_id = $1', [userId], 50)
}

export function getCollectionsBy(userId: number) {
  return selectReports(`r.status = 'collected' AND r.collector_id = $1`, [userId], 50)
}

export function getAllReports() {
  return selectReports('TRUE', [], 200)
}

export async function getReport(id: number) {
  const rows = await selectReports('r.id = $1', [id], 1)
  return rows[0] ?? null
}

export async function getRecentlyCollected(limit = 6) {
  return selectReports(`r.status = 'collected'`, [], limit)
}

export type Stats = {
  reports: number
  collected: number
  open: number
  kgCollected: number
  users: number
}

export async function getStats(): Promise<Stats> {
  const sql = await db()
  const [row] = await sql`
    SELECT
      count(*)::int AS reports,
      count(*) FILTER (WHERE status = 'collected')::int AS collected,
      count(*) FILTER (WHERE status IN ('pending', 'claimed'))::int AS open,
      coalesce(sum(est_weight_kg) FILTER (WHERE status = 'collected'), 0)::float AS kg,
      (SELECT count(*)::int FROM users) AS users
    FROM reports
    WHERE status <> 'rejected'`
  return {
    reports: row.reports,
    collected: row.collected,
    open: row.open,
    kgCollected: Math.round(Number(row.kg) * 10) / 10,
    users: row.users,
  }
}

export async function getWasteBreakdown() {
  const sql = await db()
  const rows = await sql`
    SELECT waste_type, count(*)::int AS n
    FROM reports
    WHERE status <> 'rejected'
    GROUP BY waste_type
    ORDER BY n DESC`
  return rows.map((r) => ({ label: r.waste_type as string, value: r.n as number }))
}

export async function getLast7Days() {
  const sql = await db()
  const rows = await sql`
    SELECT to_char(d, 'DD Mon') AS label, count(r.id)::int AS n
    FROM generate_series(current_date - 6, current_date, interval '1 day') AS d
    LEFT JOIN reports r ON r.created_at::date = d::date
    GROUP BY d
    ORDER BY d`
  return rows.map((r) => ({ label: r.label as string, value: r.n as number }))
}

export type LeaderRow = {
  id: number
  name: string
  points: number
  reports: number
  collections: number
}

export async function getLeaderboard(limit = 20): Promise<LeaderRow[]> {
  const sql = await db()
  const rows = await sql`
    SELECT u.id, u.name,
      coalesce((SELECT sum(points) FROM points_ledger p WHERE p.user_id = u.id), 0)::int AS points,
      (SELECT count(*) FROM reports r WHERE r.reporter_id = u.id AND r.status <> 'rejected')::int AS reports,
      (SELECT count(*) FROM reports r WHERE r.collector_id = u.id AND r.status = 'collected')::int AS collections
    FROM users u
    ORDER BY points DESC, u.id ASC
    LIMIT ${limit}`
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    points: r.points,
    reports: r.reports,
    collections: r.collections,
  }))
}

export async function getPoints(userId: number) {
  const sql = await db()
  const [row] = await sql`SELECT coalesce(sum(points), 0)::int AS total FROM points_ledger WHERE user_id = ${userId}`
  return row.total as number
}

export async function getLedger(userId: number) {
  const sql = await db()
  const rows = await sql`
    SELECT id, points, reason, report_id, created_at
    FROM points_ledger
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 30`
  return rows.map((r) => ({
    id: r.id as number,
    points: r.points as number,
    reason: r.reason as string,
    reportId: r.report_id as number | null,
    createdAt: iso(r.created_at) ?? '',
  }))
}

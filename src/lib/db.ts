import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let client: NeonQueryFunction<false, false> | null = null
let schemaReady: Promise<void> | null = null

function getClient() {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    client = neon(url)
  }
  return client
}

async function createSchema(sql: NeonQueryFunction<false, false>) {
  const [{ ready }] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'ai_checked'
    ) AS ready`
  if (ready) return

  // Runs once per database. The ai_checked column is added last, so its presence means everything is in place.
  // The advisory lock stops two cold starts from creating the same tables at once.
  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(7243001)`,
    sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    sql`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        waste_type TEXT NOT NULL,
        est_weight_kg REAL NOT NULL DEFAULT 0,
        hazard TEXT NOT NULL DEFAULT 'low',
        summary TEXT,
        confidence REAL,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        address TEXT,
        landmark TEXT,
        photo TEXT NOT NULL,
        photo_hash TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        collector_id INT REFERENCES users(id) ON DELETE SET NULL,
        claimed_at TIMESTAMPTZ,
        after_photo TEXT,
        after_photo_hash TEXT UNIQUE,
        collection_note TEXT,
        collected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    sql`CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (status)`,
    sql`CREATE INDEX IF NOT EXISTS reports_reporter_idx ON reports (reporter_id)`,
    sql`
      CREATE TABLE IF NOT EXISTS points_ledger (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_id INT REFERENCES reports(id) ON DELETE SET NULL,
        points INT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    sql`CREATE INDEX IF NOT EXISTS points_user_idx ON points_ledger (user_id)`,
    sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_type TEXT`,
    sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
    sql`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        age_group TEXT,
        occupation TEXT,
        prior_method TEXT,
        s1 INT NOT NULL, s2 INT NOT NULL, s3 INT NOT NULL, s4 INT NOT NULL, s5 INT NOT NULL,
        s6 INT NOT NULL, s7 INT NOT NULL, s8 INT NOT NULL, s9 INT NOT NULL, s10 INT NOT NULL,
        sus_score REAL NOT NULL,
        ease INT NOT NULL,
        ai_trust INT NOT NULL,
        motivation INT NOT NULL,
        recommend INT NOT NULL,
        comments TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    sql`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_checked BOOLEAN NOT NULL DEFAULT true`,
  ])
}

// Tables are created on first use, so a fresh Neon database works without a manual setup step.
export async function db() {
  const sql = getClient()
  if (!schemaReady) {
    schemaReady = createSchema(sql).catch((err) => {
      schemaReady = null
      throw err
    })
  }
  await schemaReady
  return sql
}

export function iso(value: unknown): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

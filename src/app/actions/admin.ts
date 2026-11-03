'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { attempt, UserError } from '@/lib/errors'
import { REJECT_PENALTY } from '@/lib/points'
import { requireUser } from '@/lib/session'
import { NOT_WASTE, WASTE_TYPES } from '@/lib/waste'

async function requireAdmin() {
  const user = await requireUser()
  if (!user.isAdmin) throw new UserError('Admins only.')
  return user
}

export async function rejectReport(reportId: number) {
  return attempt(async () => {
    await requireAdmin()
    const id = Number(reportId)
    const sql = await db()

    const rows = await sql`
      WITH r AS (
        UPDATE reports SET status = 'rejected', collector_id = NULL, claimed_at = NULL
        WHERE id = ${id} AND status IN ('pending', 'claimed')
        RETURNING id, reporter_id
      )
      INSERT INTO points_ledger (user_id, report_id, points, reason)
      SELECT reporter_id, id, ${-REJECT_PENALTY}, 'Report rejected by admin' FROM r
      RETURNING id`
    if (!rows.length) throw new UserError('Only open reports can be rejected.')

    revalidatePath('/admin')
    revalidatePath('/collect')
    return null
  })
}

export async function deleteReport(reportId: number) {
  return attempt(async () => {
    await requireAdmin()
    const id = Number(reportId)
    const sql = await db()
    await sql.transaction([
      sql`DELETE FROM points_ledger WHERE report_id = ${id}`,
      sql`DELETE FROM reports WHERE id = ${id}`,
    ])
    revalidatePath('/admin')
    revalidatePath('/collect')
    revalidatePath('/')
    return null
  })
}

export async function setVerifiedType(reportId: number, verifiedType: string | null) {
  return attempt(async () => {
    await requireAdmin()
    const id = Number(reportId)
    const allowed: string[] = [...WASTE_TYPES, NOT_WASTE]
    if (verifiedType !== null && !allowed.includes(verifiedType)) throw new UserError('Unknown waste type.')

    const sql = await db()
    await sql`
      UPDATE reports
      SET verified_type = ${verifiedType}, verified_at = ${verifiedType ? new Date() : null}
      WHERE id = ${id}`
    revalidatePath('/admin/accuracy')
    return null
  })
}

'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { attempt, UserError } from '@/lib/errors'
import { compareCleanup } from '@/lib/gemini'
import { distanceMeters, isValidCoord } from '@/lib/geo'
import { photoFromDataUrl, readPhoto } from '@/lib/images'
import { CLAIM_HOURS, MAX_ACTIVE_CLAIMS, collectionPoints } from '@/lib/points'
import { requireUser } from '@/lib/session'

function toId(value: unknown) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new UserError('Invalid report.')
  return id
}

export async function claimReport(reportId: number) {
  return attempt(async () => {
    const user = await requireUser()
    const id = toId(reportId)
    const sql = await db()

    const [{ n }] = await sql`
      SELECT count(*)::int AS n FROM reports
      WHERE collector_id = ${user.id} AND status = 'claimed'
        AND claimed_at > now() - make_interval(hours => ${CLAIM_HOURS})`
    if (n >= MAX_ACTIVE_CLAIMS) {
      throw new UserError(`Finish your current pick-ups first (max ${MAX_ACTIVE_CLAIMS} at a time).`)
    }

    const [report] = await sql`SELECT reporter_id FROM reports WHERE id = ${id}`
    if (!report) throw new UserError('Report not found.')
    if (report.reporter_id === user.id) throw new UserError("You can't pick up your own report.")

    const claimed = await sql`
      UPDATE reports
      SET status = 'claimed', collector_id = ${user.id}, claimed_at = now()
      WHERE id = ${id}
        AND (status = 'pending'
             OR (status = 'claimed' AND claimed_at < now() - make_interval(hours => ${CLAIM_HOURS})))
      RETURNING id`
    if (!claimed.length) throw new UserError('Someone else is already picking this up.')

    revalidatePath('/collect')
    return null
  })
}

export async function releaseReport(reportId: number) {
  return attempt(async () => {
    const user = await requireUser()
    const sql = await db()
    await sql`
      UPDATE reports SET status = 'pending', collector_id = NULL, claimed_at = NULL
      WHERE id = ${toId(reportId)} AND status = 'claimed' AND collector_id = ${user.id}`
    revalidatePath('/collect')
    return null
  })
}

export async function completeCollection(input: {
  reportId: number
  photo: string
  lat: number | null
  lng: number | null
}) {
  return attempt(async () => {
    const user = await requireUser()
    const id = toId(input?.reportId)
    const after = readPhoto(input?.photo)
    const sql = await db()

    const [report] = await sql`
      SELECT id, status, collector_id, claimed_at, lat, lng, photo, photo_hash, est_weight_kg
      FROM reports WHERE id = ${id}`
    if (!report) throw new UserError('Report not found.')
    if (report.status !== 'claimed' || report.collector_id !== user.id) {
      throw new UserError('Pick up this report first.')
    }
    if (report.photo_hash === after.hash) {
      throw new UserError('Please take a new photo of the cleaned spot.')
    }

    const used = await sql`
      SELECT id FROM reports WHERE photo_hash = ${after.hash} OR after_photo_hash = ${after.hash} LIMIT 1`
    if (used.length) throw new UserError('This photo has already been used.')

    const maxDistance = Number(process.env.COLLECT_MAX_DISTANCE_M ?? 1000)
    if (maxDistance > 0) {
      if (!isValidCoord(input.lat, input.lng)) {
        throw new UserError('Turn on location so we can confirm you are at the spot.')
      }
      const distance = distanceMeters(
        { lat: Number(report.lat), lng: Number(report.lng) },
        { lat: input.lat as number, lng: input.lng as number }
      )
      if (distance > maxDistance) {
        throw new UserError(`You seem to be ${Math.round(distance)} m away from the reported spot.`)
      }
    }

    const before = photoFromDataUrl(report.photo)
    if (!before) throw new Error(`Report ${id} has an unreadable photo`)

    let check
    try {
      check = await compareCleanup(before, after)
    } catch (err) {
      // AI is unavailable: keep the after photo and let an admin approve the clean-up instead.
      console.warn('AI clean-up check unavailable, sending to admin review', err)
      const queued = await sql`
        UPDATE reports
        SET status = 'review', after_photo = ${after.dataUrl}, after_photo_hash = ${after.hash},
            collection_note = 'Waiting for admin review (AI check unavailable)', collected_at = now()
        WHERE id = ${id} AND status = 'claimed' AND collector_id = ${user.id}
        RETURNING id`
      if (!queued.length) throw new UserError('This pick-up was already completed.')
      revalidatePath('/collect')
      revalidatePath('/admin')
      return { passed: false as const, review: true as const, check: null, points: 0 }
    }

    const passed = check.sameSpot && check.cleaned && check.confidence >= 0.6
    if (!passed) {
      return { passed: false as const, review: false as const, check, points: 0 }
    }

    const points = collectionPoints(Number(report.est_weight_kg))
    const done = await sql`
      WITH u AS (
        UPDATE reports
        SET status = 'collected', after_photo = ${after.dataUrl}, after_photo_hash = ${after.hash},
            collection_note = ${check.note}, collected_at = now()
        WHERE id = ${id} AND status = 'claimed' AND collector_id = ${user.id}
        RETURNING id
      )
      INSERT INTO points_ledger (user_id, report_id, points, reason)
      SELECT ${user.id}, id, ${points}, 'Collected waste' FROM u
      RETURNING id`
    if (!done.length) throw new UserError('This pick-up was already completed.')

    revalidatePath('/')
    revalidatePath('/collect')
    revalidatePath(`/reports/${id}`)
    return { passed: true as const, review: false as const, check, points }
  })
}

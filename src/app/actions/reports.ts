'use server'

import { SignJWT, jwtVerify } from 'jose'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { attempt, UserError } from '@/lib/errors'
import { analyzeWastePhoto, type WasteAnalysis } from '@/lib/gemini'
import { isValidCoord, lookupAddress } from '@/lib/geo'
import { readPhoto } from '@/lib/images'
import { MAX_REPORTS_PER_DAY, REPORT_POINTS } from '@/lib/points'
import { requireUser, secretKey } from '@/lib/session'

async function photoAlreadyUsed(hash: string) {
  const sql = await db()
  const rows = await sql`SELECT id FROM reports WHERE photo_hash = ${hash} OR after_photo_hash = ${hash} LIMIT 1`
  return rows.length > 0
}

export async function analyzeReport(photoDataUrl: string) {
  return attempt(async () => {
    const user = await requireUser()
    const photo = readPhoto(photoDataUrl)
    if (await photoAlreadyUsed(photo.hash)) throw new UserError('This photo has already been used.')

    const analysis = await analyzeWastePhoto(photo)
    if (!analysis.isWaste) {
      throw new UserError("We couldn't spot any waste in this photo. Try a closer, clearer shot.")
    }

    // The signed ticket ties this AI result to this user and this exact photo.
    const ticket = await new SignJWT({ uid: user.id, hash: photo.hash, analysis })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30m')
      .sign(secretKey())

    return { analysis, ticket }
  })
}

export async function findAddress(lat: number, lng: number) {
  return attempt(async () => {
    await requireUser()
    if (!isValidCoord(lat, lng)) throw new UserError('Invalid location.')
    return lookupAddress(lat, lng)
  })
}

export async function submitReport(input: {
  photo: string
  ticket: string
  lat: number
  lng: number
  address: string
  landmark: string
}) {
  return attempt(async () => {
    const user = await requireUser()
    const photo = readPhoto(input?.photo)

    let analysis: WasteAnalysis
    try {
      const { payload } = await jwtVerify(String(input?.ticket), secretKey())
      if (payload.uid !== user.id || payload.hash !== photo.hash) throw new Error('mismatch')
      analysis = payload.analysis as WasteAnalysis
    } catch {
      throw new UserError('Please analyse the photo again before submitting.')
    }

    if (!isValidCoord(input.lat, input.lng)) throw new UserError('Please set the location of the waste.')
    const address = String(input.address ?? '').trim().slice(0, 300) || null
    const landmark = String(input.landmark ?? '').trim().slice(0, 120) || null

    const sql = await db()
    const [{ n }] = await sql`
      SELECT count(*)::int AS n FROM reports
      WHERE reporter_id = ${user.id} AND created_at > now() - interval '1 day'`
    if (n >= MAX_REPORTS_PER_DAY) {
      throw new UserError(`You can send up to ${MAX_REPORTS_PER_DAY} reports a day.`)
    }
    if (await photoAlreadyUsed(photo.hash)) throw new UserError('This photo has already been used.')

    const [row] = await sql`
      WITH r AS (
        INSERT INTO reports (reporter_id, waste_type, est_weight_kg, hazard, summary, confidence,
                             lat, lng, address, landmark, photo, photo_hash)
        VALUES (${user.id}, ${analysis.wasteType}, ${analysis.weightKg}, ${analysis.hazard},
                ${analysis.summary}, ${analysis.confidence}, ${input.lat}, ${input.lng},
                ${address}, ${landmark}, ${photo.dataUrl}, ${photo.hash})
        RETURNING id
      )
      INSERT INTO points_ledger (user_id, report_id, points, reason)
      SELECT ${user.id}, id, ${REPORT_POINTS}, 'Reported waste' FROM r
      RETURNING report_id`

    revalidatePath('/')
    revalidatePath('/collect')
    return { id: row.report_id as number, points: REPORT_POINTS }
  })
}

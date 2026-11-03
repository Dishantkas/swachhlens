'use server'

import { SignJWT, jwtVerify } from 'jose'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { attempt, UserError } from '@/lib/errors'
import { analyzeWastePhoto, type Hazard, type WasteAnalysis } from '@/lib/gemini'
import { isValidCoord, lookupAddress } from '@/lib/geo'
import { readPhoto } from '@/lib/images'
import { MAX_REPORTS_PER_DAY, REPORT_POINTS } from '@/lib/points'
import { requireUser, secretKey } from '@/lib/session'
import { WASTE_TYPES, type WasteType } from '@/lib/waste'

async function photoAlreadyUsed(hash: string) {
  const sql = await db()
  const rows = await sql`SELECT id FROM reports WHERE photo_hash = ${hash} OR after_photo_hash = ${hash} LIMIT 1`
  return rows.length > 0
}

function signTicket(payload: Record<string, unknown>) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30m').sign(secretKey())
}

export async function analyzeReport(photoDataUrl: string) {
  return attempt(async () => {
    const user = await requireUser()
    const photo = readPhoto(photoDataUrl)
    if (await photoAlreadyUsed(photo.hash)) throw new UserError('This photo has already been used.')

    let analysis: WasteAnalysis
    try {
      analysis = await analyzeWastePhoto(photo)
    } catch (err) {
      // If the AI service is down, the reporter can still fill in the details by hand.
      console.warn('AI analysis unavailable, falling back to manual entry', err)
      const ticket = await signTicket({ uid: user.id, hash: photo.hash, mode: 'manual' })
      return { mode: 'manual' as const, ticket }
    }

    if (!analysis.isWaste) {
      throw new UserError("We couldn't spot any waste in this photo. Try a closer, clearer shot.")
    }

    // The signed ticket ties this AI result to this user and this exact photo.
    const ticket = await signTicket({ uid: user.id, hash: photo.hash, mode: 'ai', analysis })
    return { mode: 'ai' as const, analysis, ticket }
  })
}

export async function findAddress(lat: number, lng: number) {
  return attempt(async () => {
    await requireUser()
    if (!isValidCoord(lat, lng)) throw new UserError('Invalid location.')
    return lookupAddress(lat, lng)
  })
}

function readManual(input: unknown): WasteAnalysis {
  const manual = (input ?? {}) as { wasteType?: unknown; weightKg?: unknown; hazard?: unknown }
  const wasteType = String(manual.wasteType ?? '')
  if (!(WASTE_TYPES as readonly string[]).includes(wasteType)) throw new UserError('Please choose the waste type.')
  const weight = Number(manual.weightKg)
  if (!Number.isFinite(weight) || weight <= 0 || weight > 500) throw new UserError('Please enter a weight between 0.1 and 500 kg.')
  const hazard = String(manual.hazard ?? 'low')
  return {
    isWaste: true,
    wasteType: wasteType as WasteType,
    weightKg: Math.round(weight * 10) / 10,
    hazard: (hazard === 'high' || hazard === 'medium' ? hazard : 'low') as Hazard,
    summary: '',
    confidence: 0,
  }
}

export async function submitReport(input: {
  photo: string
  ticket: string
  lat: number
  lng: number
  address: string
  landmark: string
  manual?: { wasteType: string; weightKg: number; hazard: string }
}) {
  return attempt(async () => {
    const user = await requireUser()
    const photo = readPhoto(input?.photo)

    let payload: Record<string, unknown>
    try {
      ;({ payload } = await jwtVerify(String(input?.ticket), secretKey()))
      if (payload.uid !== user.id || payload.hash !== photo.hash) throw new Error('mismatch')
    } catch {
      throw new UserError('Please analyse the photo again before submitting.')
    }

    const aiChecked = payload.mode === 'ai'
    const analysis = aiChecked ? (payload.analysis as WasteAnalysis) : readManual(input.manual)

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
                             lat, lng, address, landmark, photo, photo_hash, ai_checked)
        VALUES (${user.id}, ${analysis.wasteType}, ${analysis.weightKg}, ${analysis.hazard},
                ${analysis.summary || null}, ${aiChecked ? analysis.confidence : null}, ${input.lat}, ${input.lng},
                ${address}, ${landmark}, ${photo.dataUrl}, ${photo.hash}, ${aiChecked})
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

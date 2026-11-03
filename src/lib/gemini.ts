import 'server-only'
import { UserError } from './errors'
import { WASTE_TYPES, type WasteType } from './waste'

export { WASTE_TYPES, type WasteType }
export type Hazard = 'low' | 'medium' | 'high'

type ImagePart = { mimeType: string; base64: string }

const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3-flash-preview']
const RETRYABLE = new Set([429, 500, 502, 503, 504])

let workingModel: string | null = null

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function callModel(model: string, key: string, body: string): Promise<Response | null> {
  try {
    return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    })
  } catch (err) {
    console.warn(`Gemini model ${model} timed out or failed`, err)
    return null
  }
}

async function ask(prompt: string, images: ImagePart[]): Promise<any> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')

  const request = (withThinking: boolean) =>
    JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            ...images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        // Low thinking keeps photo checks fast; this task does not need deep reasoning.
        ...(withThinking ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
      },
    })
  let body = request(true)
  let thinkingRejected = false

  // Models get retired or overloaded from time to time, so retry once and then move on to the next model.
  const preferred = workingModel ?? process.env.GEMINI_MODEL
  const models = [...new Set([preferred, ...FALLBACK_MODELS].filter(Boolean) as string[])]
  const started = Date.now()

  let res: Response | null = null
  let lastError = 'no response'
  outer: for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() - started > 50000) break outer
      res = await callModel(model, key, body)
      if (res?.ok) {
        workingModel = model
        break outer
      }
      const errorText = res ? await res.text() : ''
      lastError = res ? `${model} ${res.status} ${errorText.slice(0, 300)}` : `${model} timeout`
      console.warn(`Gemini request failed: ${lastError}`)
      if (res?.status === 400 && /thinking/i.test(errorText) && !thinkingRejected) {
        thinkingRejected = true
        body = request(false)
        attempt -= 1
        continue
      }
      if (res && !RETRYABLE.has(res.status)) break
      if (attempt === 0) await sleep(1500)
    }
    if (res && !RETRYABLE.has(res.status) && res.status !== 404) break
  }

  if (!res || !res.ok) {
    if (!res || RETRYABLE.has(res.status)) {
      throw new UserError('The AI service is busy right now. Please try again in a minute.')
    }
    throw new Error(`Gemini request failed: ${lastError}`)
  }

  const data = await res.json()
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

function confidence(value: unknown) {
  let n = Number(value)
  if (!Number.isFinite(n)) return 0
  if (n > 1) n = n / 100
  return Math.min(Math.max(n, 0), 1)
}

export type WasteAnalysis = {
  isWaste: boolean
  wasteType: WasteType
  weightKg: number
  hazard: Hazard
  summary: string
  confidence: number
}

export async function analyzeWastePhoto(photo: ImagePart): Promise<WasteAnalysis> {
  const prompt = `You are helping a city clean-up app. Look at the photo and decide whether it shows litter or dumped waste in a public place.

Reply with JSON only, in this shape:
{
  "isWaste": true,
  "wasteType": one of ${WASTE_TYPES.map((t) => `"${t}"`).join(', ')},
  "estimatedWeightKg": number,
  "hazard": "low" | "medium" | "high",
  "summary": "one short sentence describing the waste",
  "confidence": number between 0 and 1
}

Use "mixed" when several kinds are present. Mark hazard "high" for broken glass, medical, chemical or burning waste.
If the photo does not show waste, set "isWaste" to false.`

  const raw = await ask(prompt, [photo])
  const type = String(raw.wasteType ?? '').toLowerCase()
  const hazard = String(raw.hazard ?? '').toLowerCase()
  const weight = Number(raw.estimatedWeightKg)

  return {
    isWaste: raw.isWaste === true,
    wasteType: (WASTE_TYPES as readonly string[]).includes(type) ? (type as WasteType) : 'mixed',
    weightKg: Number.isFinite(weight) ? Math.min(Math.max(Math.round(weight * 10) / 10, 0.1), 500) : 1,
    hazard: hazard === 'high' || hazard === 'medium' ? hazard : 'low',
    summary: String(raw.summary ?? '').slice(0, 200),
    confidence: confidence(raw.confidence),
  }
}

export type CleanupCheck = {
  sameSpot: boolean
  cleaned: boolean
  confidence: number
  note: string
}

export async function compareCleanup(before: ImagePart, after: ImagePart): Promise<CleanupCheck> {
  const prompt = `You are checking a waste pick-up for a city clean-up app.
The first image was taken when the waste was reported. The second image was taken by the collector after picking it up.

Decide:
- "sameSpot": does the second photo plausibly show the same place (same ground, walls, road, objects)?
- "cleaned": has the waste from the first photo been removed in the second photo?

Reply with JSON only:
{ "sameSpot": true, "cleaned": true, "confidence": number between 0 and 1, "note": "one short sentence" }`

  const raw = await ask(prompt, [before, after])
  return {
    sameSpot: raw.sameSpot === true,
    cleaned: raw.cleaned === true,
    confidence: confidence(raw.confidence),
    note: String(raw.note ?? '').slice(0, 200),
  }
}

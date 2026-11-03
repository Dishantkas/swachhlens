import 'server-only'
import { createHash } from 'crypto'
import { UserError } from './errors'

const MAX_BYTES = 3 * 1024 * 1024
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/

export type Photo = {
  mimeType: string
  base64: string
  hash: string
  dataUrl: string
}

export function readPhoto(input: unknown): Photo {
  if (typeof input !== 'string') throw new UserError('Please add a photo.')
  const match = DATA_URL.exec(input)
  if (!match) throw new UserError('Unsupported image. Use a JPG, PNG or WebP photo.')

  const [, mimeType, base64] = match
  if ((base64.length * 3) / 4 > MAX_BYTES) throw new UserError('Photo is too large.')

  return {
    mimeType,
    base64,
    hash: createHash('sha256').update(base64).digest('hex'),
    dataUrl: input,
  }
}

export function photoFromDataUrl(dataUrl: string) {
  const match = DATA_URL.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

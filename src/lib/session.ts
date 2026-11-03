import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { db } from './db'
import { UserError } from './errors'

const COOKIE = 'sl_session'
const MAX_AGE = 60 * 60 * 24 * 7

export type SessionUser = {
  id: number
  name: string
  email: string
  isAdmin: boolean
}

export function secretKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

export function isAdminEmail(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return admins.includes(email.toLowerCase())
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey())

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function destroySession() {
  cookies().delete(COOKIE)
}

export async function getUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value
  if (!token) return null

  let uid: number
  try {
    const { payload } = await jwtVerify(token, secretKey())
    uid = Number(payload.uid)
  } catch {
    return null
  }
  if (!Number.isInteger(uid)) return null

  const sql = await db()
  const rows = await sql`SELECT id, name, email FROM users WHERE id = ${uid}`
  const row = rows[0]
  if (!row) return null

  return {
    id: row.id as number,
    name: row.name as string,
    email: row.email as string,
    isAdmin: isAdminEmail(row.email as string),
  }
}

export async function requireUser() {
  const user = await getUser()
  if (!user) throw new UserError('Please log in first.')
  return user
}

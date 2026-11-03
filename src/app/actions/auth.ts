'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { attempt, UserError } from '@/lib/errors'
import { createSession, destroySession } from '@/lib/session'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function register(input: { name: string; email: string; password: string }) {
  return attempt(async () => {
    const name = String(input?.name ?? '').trim().slice(0, 60)
    const email = String(input?.email ?? '').trim().toLowerCase()
    const password = String(input?.password ?? '')

    if (name.length < 2) throw new UserError('Please enter your name.')
    if (!EMAIL.test(email)) throw new UserError('Please enter a valid email address.')
    if (password.length < 8) throw new UserError('Password must be at least 8 characters.')

    const sql = await db()
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length) throw new UserError('An account with this email already exists.')

    const hash = await bcrypt.hash(password, 10)
    const [user] = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name}, ${email}, ${hash})
      RETURNING id`
    await createSession(user.id)
    return null
  })
}

export async function login(input: { email: string; password: string }) {
  return attempt(async () => {
    const email = String(input?.email ?? '').trim().toLowerCase()
    const password = String(input?.password ?? '')

    const sql = await db()
    const [user] = await sql`SELECT id, password_hash FROM users WHERE email = ${email}`
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!user || !valid) throw new UserError('Wrong email or password.')

    await createSession(user.id)
    return null
  })
}

export async function logout() {
  destroySession()
  redirect('/')
}

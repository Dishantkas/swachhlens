'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { login, register } from '@/app/actions/auth'

export default function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = mode === 'login' ? await login({ email, password }) : await register({ name, email, password })
    if (!res.ok) {
      setError(res.error)
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  const isLogin = mode === 'login'
  const switchHref = `${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`

  return (
    <div className="mx-auto max-w-sm">
      <div className="card">
        <h1 className="text-xl font-bold">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {isLogin ? 'Log in to report and collect waste.' : 'Join SwachhLens and start earning points.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!isLogin && (
            <div>
              <label className="label" htmlFor="name">
                Name
              </label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              minLength={isLogin ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {!isLogin && <p className="mt-1 text-xs text-stone-500">At least 8 characters</p>}
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Loader2 className="animate-spin" size={16} />}
            {isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-stone-600">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link href={switchHref} className="font-medium text-brand-700 hover:underline">
          {isLogin ? 'Create an account' : 'Log in'}
        </Link>
      </p>
    </div>
  )
}

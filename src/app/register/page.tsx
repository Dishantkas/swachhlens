import { redirect } from 'next/navigation'
import AuthForm from '@/components/AuthForm'
import { safeNext } from '@/lib/safe-next'
import { getUser } from '@/lib/session'

export default async function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = safeNext(searchParams.next)
  if (await getUser()) redirect(next)
  return <AuthForm mode="register" next={next} />
}

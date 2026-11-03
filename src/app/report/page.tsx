import { redirect } from 'next/navigation'
import ReportForm from '@/components/ReportForm'
import { getUser } from '@/lib/session'

export const maxDuration = 60

export default async function ReportPage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/report')

  return (
    <div>
      <h1 className="text-2xl font-bold">Report waste</h1>
      <p className="mb-6 mt-1 text-stone-600">
        Snap a photo of litter or a dumping spot. Our AI identifies the waste, and collectors near you get notified on the
        map.
      </p>
      <ReportForm />
    </div>
  )
}

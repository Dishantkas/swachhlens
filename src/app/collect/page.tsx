import CollectBoard from '@/components/CollectBoard'
import { getClaimedBy, getOpenReports } from '@/lib/queries'
import { getUser } from '@/lib/session'

export const maxDuration = 60

export default async function CollectPage() {
  const user = await getUser()
  const [open, mine] = await Promise.all([getOpenReports(), user ? getClaimedBy(user.id) : Promise.resolve([])])

  return (
    <div>
      <h1 className="text-2xl font-bold">Collect waste</h1>
      <p className="mb-6 mt-1 text-stone-600">
        Pick a spot near you, clean it up, and take an &quot;after&quot; photo. Once the AI confirms the spot is clean, you
        earn points based on how much waste you removed.
      </p>
      <CollectBoard open={open} mine={mine} userId={user?.id ?? null} />
    </div>
  )
}

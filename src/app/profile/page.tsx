import Link from 'next/link'
import { redirect } from 'next/navigation'
import StatusBadge from '@/components/StatusBadge'
import { capitalize, formatDate } from '@/lib/format'
import { getCollectionsBy, getLedger, getPoints, getReportsBy, type ReportItem } from '@/lib/queries'
import { getUser } from '@/lib/session'

export default async function ProfilePage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/profile')

  const [points, reports, collections, ledger] = await Promise.all([
    getPoints(user.id),
    getReportsBy(user.id),
    getCollectionsBy(user.id),
    getLedger(user.id),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hi, {user.name}</h1>
          <p className="text-stone-600">{user.email}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Points" value={points} highlight />
          <Stat label="Reports" value={reports.length} />
          <Stat label="Pick-ups" value={collections.length} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">My reports</h2>
          <ReportList items={reports} empty="You haven't reported anything yet." />

          <h2 className="mb-3 mt-8 font-semibold">My pick-ups</h2>
          <ReportList items={collections} empty="No pick-ups yet. Check the Collect page." />
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Points history</h2>
          <div className="card divide-y divide-stone-100 p-0">
            {ledger.length === 0 && <p className="p-4 text-sm text-stone-500">No points yet.</p>}
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{entry.reason}</p>
                  <p className="text-xs text-stone-500">{formatDate(entry.createdAt)}</p>
                </div>
                <span className={entry.points >= 0 ? 'font-semibold text-brand-700' : 'font-semibold text-red-600'}>
                  {entry.points >= 0 ? '+' : ''}
                  {entry.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl px-5 py-3 ${highlight ? 'bg-amber-50 text-amber-800' : 'bg-white ring-1 ring-stone-200'}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  )
}

function ReportList({ items, empty }: { items: ReportItem[]; empty: string }) {
  if (items.length === 0) return <div className="card text-sm text-stone-500">{empty}</div>
  return (
    <div className="card divide-y divide-stone-100 p-0">
      {items.map((r) => (
        <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
          <img src={`/api/photo/${r.id}`} alt="" className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {capitalize(r.wasteType)} · ~{r.weightKg} kg
            </p>
            <p className="truncate text-xs text-stone-500">{r.landmark || r.address}</p>
          </div>
          <div className="text-right">
            <StatusBadge status={r.status} />
            <p className="mt-1 text-xs text-stone-400">{formatDate(r.createdAt)}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

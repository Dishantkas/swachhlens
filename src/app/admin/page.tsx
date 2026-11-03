import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import AdminActions from '@/components/AdminActions'
import BarChart from '@/components/BarChart'
import StatusBadge from '@/components/StatusBadge'
import { WASTE_COLORS, capitalize, formatDate } from '@/lib/format'
import { getAllReports, getLast7Days, getStats, getWasteBreakdown } from '@/lib/queries'
import { getUser } from '@/lib/session'

export default async function AdminPage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/admin')
  if (!user.isAdmin) notFound()

  const [stats, byType, week, reports] = await Promise.all([
    getStats(),
    getWasteBreakdown(),
    getLast7Days(),
    getAllReports(),
  ])

  const cards = [
    { label: 'Total reports', value: stats.reports },
    { label: 'Open', value: stats.open },
    { label: 'Cleaned', value: stats.collected },
    { label: 'Kg collected', value: stats.kgCollected },
    { label: 'Users', value: stats.users },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-sm text-stone-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Reports in the last 7 days</h2>
          <BarChart data={week} />
        </div>
        <div className="card">
          <h2 className="mb-4 font-semibold">Reports by waste type</h2>
          <BarChart horizontal data={byType.map((d) => ({ ...d, color: WASTE_COLORS[d.label] }))} />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Reporter</th>
              <th className="px-4 py-3">Collector</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <Link href={`/reports/${r.id}`} className="flex items-center gap-3 hover:underline">
                    <img src={`/api/photo/${r.id}`} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                    <span>
                      <span className="block font-medium">
                        #{r.id} {capitalize(r.wasteType)}
                      </span>
                      <span className="text-xs text-stone-500">{formatDate(r.createdAt)}</span>
                    </span>
                  </Link>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-stone-600">{r.landmark || r.address}</td>
                <td className="px-4 py-3">{r.reporterName}</td>
                <td className="px-4 py-3">{r.collectorName ?? '—'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <AdminActions id={r.id} status={r.status} />
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-stone-500">
                  No reports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

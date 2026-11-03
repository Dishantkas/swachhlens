import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import AdminActions from '@/components/AdminActions'
import AdminTabs from '@/components/AdminTabs'
import BarChart from '@/components/BarChart'
import MapView from '@/components/MapView'
import StatusBadge from '@/components/StatusBadge'
import { WASTE_COLORS, capitalize, formatDate } from '@/lib/format'
import { getAllReports, getLast7Days, getStats, getWasteBreakdown } from '@/lib/queries'
import { getCleanupTimes, getHotspots } from '@/lib/research'
import { getUser } from '@/lib/session'

export default async function AdminPage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/admin')
  if (!user.isAdmin) notFound()

  const [stats, byType, week, reports, hotspots, cleanup] = await Promise.all([
    getStats(),
    getWasteBreakdown(),
    getLast7Days(),
    getAllReports(),
    getHotspots(),
    getCleanupTimes(),
  ])

  const maxHotspot = Math.max(1, ...hotspots.map((h) => h.reports))
  const hotspotPoints = hotspots.map((h, i) => ({
    id: i + 1,
    lat: h.lat,
    lng: h.lng,
    radius: 10 + (h.reports / maxHotspot) * 22,
    color: h.cleaned === h.reports ? '#279c63' : '#dc2626',
    popup: `${h.place} · ${h.reports} reports, ${h.cleaned} cleaned`,
  }))
  const hours = (v: number | null) => (v === null ? '—' : v < 24 ? `${v.toFixed(1)} h` : `${(v / 24).toFixed(1)} days`)

  const cards = [
    { label: 'Total reports', value: stats.reports },
    { label: 'Open', value: stats.open },
    { label: 'Needs review', value: stats.review },
    { label: 'Cleaned', value: stats.collected },
    { label: 'Kg collected', value: stats.kgCollected },
    { label: 'Users', value: stats.users },
    { label: 'Avg. time to clean', value: hours(cleanup.avgHours) },
  ]

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <AdminTabs />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-3">
          <h2 className="mb-1 font-semibold">Waste hotspots</h2>
          <p className="mb-3 text-sm text-stone-500">
            Reports grouped into ~1 km areas. Bigger circle = more reports. Red = still has open reports.
          </p>
          <MapView points={hotspotPoints} className="h-80" />
        </div>
        <div className="card overflow-x-auto lg:col-span-2">
          <h2 className="mb-3 font-semibold">Top areas</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="py-2">Area</th>
                <th className="py-2 text-right">Reports</th>
                <th className="py-2 text-right">Cleaned</th>
                <th className="py-2 text-right">Kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {hotspots.map((h, i) => (
                <tr key={i}>
                  <td className="max-w-[180px] truncate py-2" title={h.place}>
                    {h.place}
                  </td>
                  <td className="py-2 text-right">{h.reports}</td>
                  <td className="py-2 text-right">{h.cleaned}</td>
                  <td className="py-2 text-right">{h.kg}</td>
                </tr>
              ))}
              {hotspots.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-stone-500">
                    No reports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
                    <img src={`/api/photo/${r.id}?any=1`} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
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

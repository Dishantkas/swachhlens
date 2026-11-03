import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, MapPin, Scale, User } from 'lucide-react'
import MapView from '@/components/MapView'
import StatusBadge, { HazardBadge } from '@/components/StatusBadge'
import { capitalize, formatDate } from '@/lib/format'
import { getReport } from '@/lib/queries'

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const report = await getReport(id)
  if (!report || report.status === 'rejected') notFound()

  const collected = report.status === 'collected' || report.status === 'review'

  return (
    <div className="space-y-6">
      <Link href="/collect" className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{capitalize(report.wasteType)} waste</h1>
        <StatusBadge status={report.status} />
        <HazardBadge hazard={report.hazard} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`grid gap-3 ${collected ? 'grid-cols-2' : ''}`}>
          <figure>
            <img src={`/api/photo/${report.id}`} alt="Reported waste" className="aspect-square w-full rounded-xl object-cover" />
            <figcaption className="mt-1 text-center text-xs text-stone-500">Reported</figcaption>
          </figure>
          {collected && (
            <figure>
              <img
                src={`/api/photo/${report.id}?v=after`}
                alt="After clean-up"
                className="aspect-square w-full rounded-xl object-cover"
              />
              <figcaption className="mt-1 text-center text-xs text-stone-500">After clean-up</figcaption>
            </figure>
          )}
        </div>

        <div className="space-y-4">
          <div className="card space-y-3 text-sm">
            {report.summary && <p className="text-base text-stone-800">{report.summary}</p>}
            {!report.aiChecked && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Details entered by the reporter (AI was unavailable).</p>
            )}
            <p className="flex items-center gap-2 text-stone-600">
              <Scale size={16} /> About {report.weightKg} kg
            </p>
            <p className="flex items-start gap-2 text-stone-600">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>
                {report.landmark && <b className="block text-stone-800">{report.landmark}</b>}
                {report.address}
              </span>
            </p>
            <p className="flex items-center gap-2 text-stone-600">
              <User size={16} /> Reported by {report.reporterName}
            </p>
            <p className="flex items-center gap-2 text-stone-600">
              <Calendar size={16} /> {formatDate(report.createdAt)}
            </p>
            {collected && (
              <div className="rounded-lg bg-brand-50 p-3 text-brand-800">
                {report.status === 'review' ? 'Clean-up by' : 'Cleaned by'} <b>{report.collectorName}</b> on{' '}
                {formatDate(report.collectedAt)}
                {report.collectionNote && <p className="mt-1 text-sm text-stone-700">{report.collectionNote}</p>}
              </div>
            )}
          </div>
          <MapView points={[{ id: report.id, lat: report.lat, lng: report.lng }]} className="h-64" />
        </div>
      </div>
    </div>
  )
}

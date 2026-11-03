import Link from 'next/link'
import { Camera, Recycle, Sparkles, Trophy } from 'lucide-react'
import { capitalize, formatDate } from '@/lib/format'
import { getRecentlyCollected, getStats, type ReportItem, type Stats } from '@/lib/queries'

const steps = [
  {
    icon: Camera,
    title: 'Snap',
    text: 'See litter or a dumping spot? Take a photo and pin the location.',
  },
  {
    icon: Sparkles,
    title: 'AI sorts it',
    text: 'Gemini AI identifies the waste type, estimates the weight and flags hazards.',
  },
  {
    icon: Recycle,
    title: 'Clean',
    text: 'A volunteer picks it up and uploads an after photo. AI checks the spot is clean.',
  },
  {
    icon: Trophy,
    title: 'Earn',
    text: 'Reporters and collectors earn points and climb the leaderboard.',
  },
]

export default async function HomePage() {
  let stats: Stats = { reports: 0, collected: 0, open: 0, review: 0, kgCollected: 0, users: 0 }
  let recent: ReportItem[] = []
  try {
    ;[stats, recent] = await Promise.all([getStats(), getRecentlyCollected(3)])
  } catch (err) {
    console.error(err)
  }

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 py-6 lg:grid-cols-2">
        <div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            Snap it. Report it. Clean it.
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-stone-900 md:text-5xl">
            Turn a photo of litter into a <span className="text-brand-600">cleaner street</span>.
          </h1>
          <p className="mt-4 text-lg text-stone-600">
            SwachhLens lets anyone report waste with their phone camera. AI identifies what it is, volunteers collect it,
            and every clean-up is verified with a before-and-after photo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/report" className="btn-primary px-6 py-3 text-base">
              <Camera size={18} /> Report waste
            </Link>
            <Link href="/collect" className="btn-outline px-6 py-3 text-base">
              Find spots to clean
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard value={stats.reports} label="Spots reported" />
          <StatCard value={stats.collected} label="Spots cleaned" />
          <StatCard value={`${stats.kgCollected} kg`} label="Waste collected" />
          <StatCard value={stats.users} label="Volunteers" />
        </div>
      </section>

      <section>
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="card">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon size={20} />
                </span>
                <span className="text-sm font-medium text-stone-400">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">Recently cleaned</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {recent.map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="card overflow-hidden p-0 transition hover:shadow-md">
                <div className="grid grid-cols-2">
                  <img src={`/api/photo/${r.id}`} alt="Before" className="aspect-square w-full object-cover" loading="lazy" />
                  <img
                    src={`/api/photo/${r.id}?v=after`}
                    alt="After"
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <p className="font-medium">
                    {capitalize(r.wasteType)} · ~{r.weightKg} kg
                  </p>
                  <p className="text-sm text-stone-500">
                    Cleaned by {r.collectorName} · {formatDate(r.collectedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="card text-center">
      <p className="text-3xl font-bold text-brand-700">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{label}</p>
    </div>
  )
}

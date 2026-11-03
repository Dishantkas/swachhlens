import { notFound, redirect } from 'next/navigation'
import AdminTabs from '@/components/AdminTabs'
import LabelGrid from '@/components/LabelGrid'
import { capitalize } from '@/lib/format'
import { ACCURACY_TARGET, getAccuracy, getLabelQueue } from '@/lib/research'
import { getUser } from '@/lib/session'
import { formatP } from '@/lib/stats'
import { NOT_WASTE } from '@/lib/waste'

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 1000) / 10}%`)
const name = (c: string) => (c === NOT_WASTE ? 'Not waste' : capitalize(c))

export default async function AccuracyPage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/admin/accuracy')
  if (!user.isAdmin) notFound()

  const [acc, queue] = await Promise.all([getAccuracy(), getLabelQueue()])
  const unlabeled = queue.filter((q) => !q.verifiedType).length
  const maxCell = Math.max(1, ...acc.classes.flatMap((a) => acc.classes.map((p) => acc.matrix[a][p])))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <AdminTabs />

      <section>
        <h2 className="text-lg font-semibold">How accurate is the AI?</h2>
        <p className="mb-4 text-sm text-stone-600">
          Check each photo below and pick the real waste type. The numbers update as you label more reports.
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Reports checked" value={acc.total} />
          <Stat label="AI correct" value={acc.correct} />
          <Stat label="Accuracy" value={pct(acc.total ? acc.accuracy : null)} />
          <Stat label="Still to check" value={unlabeled} />
        </div>

        {acc.test && (
          <div className="card mt-4 text-sm">
            <p className="font-semibold">Hypothesis test (exact binomial, one-tailed)</p>
            <p className="mt-1 text-stone-600">
              H₀: AI accuracy ≤ {ACCURACY_TARGET * 100}% · H₁: AI accuracy &gt; {ACCURACY_TARGET * 100}%
            </p>
            <p className="mt-2">
              Observed {acc.correct}/{acc.total} = <b>{pct(acc.accuracy)}</b>, {formatP(acc.test.p)} →{' '}
              <b className={acc.test.p < 0.05 ? 'text-brand-700' : 'text-amber-700'}>
                {acc.test.p < 0.05 ? 'Reject H₀ at the 5% level' : 'Not enough evidence to reject H₀'}
              </b>
            </p>
          </div>
        )}
      </section>

      {acc.total > 0 && (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card overflow-x-auto">
            <h3 className="mb-3 font-semibold">Confusion matrix</h3>
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="p-1 text-left text-stone-500">Actual ↓ / AI →</th>
                  {acc.classes.map((c) => (
                    <th key={c} className="p-1 font-medium text-stone-600">
                      {name(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acc.classes.map((a) => (
                  <tr key={a}>
                    <th className="p-1 text-left font-medium text-stone-600">{name(a)}</th>
                    {acc.classes.map((p) => {
                      const v = acc.matrix[a][p]
                      const alpha = v ? 0.15 + (v / maxCell) * 0.75 : 0
                      return (
                        <td
                          key={p}
                          className="h-9 w-12 text-center font-semibold"
                          style={{
                            backgroundColor: v ? `rgba(${a === p ? '39,156,99' : '220,38,38'},${alpha})` : '#fafaf9',
                            color: alpha > 0.55 ? '#fff' : '#292524',
                          }}
                        >
                          {v || ''}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-x-auto">
            <h3 className="mb-3 font-semibold">Per-class results</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="py-2">Type</th>
                  <th className="py-2 text-right">Reports</th>
                  <th className="py-2 text-right">Precision</th>
                  <th className="py-2 text-right">Recall</th>
                  <th className="py-2 text-right">F1</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {acc.perClass.map((c) => (
                  <tr key={c.label}>
                    <td className="py-2">{name(c.label)}</td>
                    <td className="py-2 text-right">{c.support}</td>
                    <td className="py-2 text-right">{pct(c.precision)}</td>
                    <td className="py-2 text-right">{pct(c.recall)}</td>
                    <td className="py-2 text-right">{pct(c.f1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Check reports</h2>
        <LabelGrid items={queue} />
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  )
}

import { notFound, redirect } from 'next/navigation'
import AdminTabs from '@/components/AdminTabs'
import BarChart from '@/components/BarChart'
import { formatDate } from '@/lib/format'
import { LIKERT_NEUTRAL, SUS_BENCHMARK, getSurveyResults } from '@/lib/research'
import { getUser } from '@/lib/session'
import { formatP, susGrade, type TTest } from '@/lib/stats'
import { LIKERT, SUS_ITEMS } from '@/lib/survey'

const fixed = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—')

export default async function SurveyResultsPage() {
  const user = await getUser()
  if (!user) redirect('/login?next=/admin/survey')
  if (!user.isAdmin) notFound()

  const s = await getSurveyResults()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <AdminTabs />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Responses (n)" value={s.n} />
        <Stat label="Mean SUS score" value={s.n ? fixed(s.sus.mean, 1) : '—'} />
        <Stat label="SUS std. deviation" value={s.n > 1 ? fixed(s.sus.sd, 1) : '—'} />
        <Stat label="Usability grade" value={s.n ? susGrade(s.sus.mean) : '—'} />
      </div>

      {s.n === 0 ? (
        <div className="card text-center text-stone-500">
          No survey responses yet. Share the <b>/feedback</b> page with your users.
        </div>
      ) : (
        <>
          <section className="card">
            <h2 className="font-semibold">Hypothesis tests (one-sample t-test, one-tailed, α = 0.05)</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="py-2">Hypothesis (H₁)</th>
                    <th className="py-2 text-right">Mean</th>
                    <th className="py-2 text-right">SD</th>
                    <th className="py-2 text-right">t (df)</th>
                    <th className="py-2 text-right">p</th>
                    <th className="py-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <TestRow label={`Mean SUS score > ${SUS_BENCHMARK} (industry average)`} test={s.sus.test} />
                  {s.items.map((item) => (
                    <TestRow key={item.key} label={`${item.short}: mean > ${LIKERT_NEUTRAL} (neutral)`} test={item.test} />
                  ))}
                </tbody>
              </table>
            </div>
            {s.n < 2 && <p className="mt-2 text-xs text-stone-500">At least 2 responses are needed for t-tests.</p>}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="mb-4 font-semibold">Agreement with each statement</h2>
              <div className="space-y-4">
                {s.items.map((item) => (
                  <div key={item.key}>
                    <p className="text-sm text-stone-700">{item.text}</p>
                    <div className="mt-1.5 flex h-5 overflow-hidden rounded-full bg-stone-100 text-[10px] font-medium text-white">
                      {item.distribution.map((count, i) =>
                        count ? (
                          <div
                            key={i}
                            title={`${LIKERT[i]}: ${count}`}
                            className="flex items-center justify-center"
                            style={{ width: `${(count / s.n) * 100}%`, backgroundColor: LIKERT_COLORS[i] }}
                          >
                            {count}
                          </div>
                        ) : null
                      )}
                    </div>
                    <p className="mt-1 text-xs text-stone-500">Mean {fixed(item.mean)} / 5</p>
                  </div>
                ))}
                <div className="flex flex-wrap gap-3 pt-2 text-xs text-stone-500">
                  {LIKERT.map((l, i) => (
                    <span key={l} className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: LIKERT_COLORS[i] }} /> {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="mb-4 font-semibold">SUS item averages (1–5)</h2>
              <ol className="space-y-2 text-sm">
                {SUS_ITEMS.map((text, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span className="text-stone-600">
                      {i + 1}. {text}
                    </span>
                    <span className="shrink-0 font-semibold">{fixed(s.sus.itemMeans[i])}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-stone-500">Odd items are positive (higher is better), even items are negative (lower is better).</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <div className="card">
              <h2 className="mb-4 font-semibold">Age group</h2>
              <BarChart horizontal data={s.ageGroups} />
            </div>
            <div className="card">
              <h2 className="mb-4 font-semibold">Occupation</h2>
              <BarChart horizontal data={s.occupations} />
            </div>
            <div className="card">
              <h2 className="mb-4 font-semibold">How they reported waste before</h2>
              <BarChart horizontal data={s.priorMethods} />
            </div>
          </section>

          {s.comments.length > 0 && (
            <section className="card">
              <h2 className="mb-3 font-semibold">Suggestions from users</h2>
              <ul className="divide-y divide-stone-100 text-sm">
                {s.comments.map((c) => (
                  <li key={c.id} className="py-2">
                    <p className="text-stone-700">{c.text}</p>
                    <p className="text-xs text-stone-400">{formatDate(c.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

const LIKERT_COLORS = ['#dc2626', '#f97316', '#a8a29e', '#4bb77f', '#197d4f']

function TestRow({ label, test }: { label: string; test: TTest | null }) {
  if (!test) {
    return (
      <tr>
        <td className="py-2">{label}</td>
        <td colSpan={5} className="py-2 text-right text-stone-400">
          Not enough data
        </td>
      </tr>
    )
  }
  const significant = test.p < 0.05
  return (
    <tr>
      <td className="py-2">{label}</td>
      <td className="py-2 text-right">{fixed(test.mean)}</td>
      <td className="py-2 text-right">{fixed(test.sd)}</td>
      <td className="py-2 text-right">
        {fixed(test.t)} ({test.df})
      </td>
      <td className="py-2 text-right">{formatP(test.p)}</td>
      <td className={`py-2 text-right font-medium ${significant ? 'text-brand-700' : 'text-amber-700'}`}>
        {significant ? 'Reject H₀' : 'Fail to reject H₀'}
      </td>
    </tr>
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

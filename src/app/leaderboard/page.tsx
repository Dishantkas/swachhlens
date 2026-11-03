import { Medal, Trophy } from 'lucide-react'
import { getLeaderboard } from '@/lib/queries'
import { getUser } from '@/lib/session'

const medalColors = ['text-amber-500', 'text-stone-400', 'text-orange-700']

export default async function LeaderboardPage() {
  const [rows, user] = await Promise.all([getLeaderboard(), getUser()])

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Trophy className="text-amber-500" size={32} />
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-stone-600">Top contributors keeping the city clean.</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Reports</th>
              <th className="px-4 py-3 text-right">Pick-ups</th>
              <th className="px-4 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row, i) => (
              <tr key={row.id} className={row.id === user?.id ? 'bg-brand-50' : ''}>
                <td className="px-4 py-3">
                  {i < 3 ? <Medal className={medalColors[i]} size={20} /> : <span className="pl-1 text-stone-500">{i + 1}</span>}
                </td>
                <td className="px-4 py-3 font-medium">
                  {row.name}
                  {row.id === user?.id && <span className="ml-2 text-xs text-brand-700">(you)</span>}
                </td>
                <td className="px-4 py-3 text-right">{row.reports}</td>
                <td className="px-4 py-3 text-right">{row.collections}</td>
                <td className="px-4 py-3 text-right font-semibold text-amber-700">{row.points}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                  No one on the board yet. Be the first!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

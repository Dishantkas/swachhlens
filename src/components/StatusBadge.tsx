const styles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  claimed: 'bg-sky-50 text-sky-700 ring-sky-200',
  collected: 'bg-brand-50 text-brand-700 ring-brand-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
}

const labels: Record<string, string> = {
  pending: 'Waiting for pick-up',
  claimed: 'Being collected',
  collected: 'Cleaned',
  rejected: 'Rejected',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  )
}

export function HazardBadge({ hazard }: { hazard: string }) {
  if (hazard === 'low') return null
  const style = hazard === 'high' ? 'bg-red-600 text-white' : 'bg-orange-100 text-orange-700'
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{hazard} hazard</span>
}

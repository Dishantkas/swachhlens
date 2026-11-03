export function formatDate(value: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function timeAgo(value: string | null) {
  if (!value) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} d ago`
  return formatDate(value)
}

export function capitalize(text: string) {
  return text ? text[0].toUpperCase() + text.slice(1) : text
}

export const WASTE_COLORS: Record<string, string> = {
  plastic: '#2563eb',
  paper: '#a16207',
  glass: '#0891b2',
  metal: '#64748b',
  organic: '#16a34a',
  'e-waste': '#7c3aed',
  textile: '#db2777',
  construction: '#ea580c',
  mixed: '#475569',
}

export function safeNext(value: string | string[] | undefined, fallback = '/report') {
  const next = Array.isArray(value) ? value[0] : value
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}

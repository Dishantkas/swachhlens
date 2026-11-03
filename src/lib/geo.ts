import 'server-only'

export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  )
}

// OpenStreetMap's free reverse geocoder. Falls back to plain coordinates if it is slow or down.
export async function lookupAddress(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SwachhLens/1.0', 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    if (!res.ok) return fallback
    const data = await res.json()
    const name = typeof data.display_name === 'string' ? data.display_name : ''
    return name ? name.split(', ').slice(0, 4).join(', ') : fallback
  } catch {
    return fallback
  }
}

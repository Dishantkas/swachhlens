'use client'

import { useEffect, useRef, useState } from 'react'
import type { LayerGroup, LeafletMouseEvent, Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapPoint = {
  id: number
  lat: number
  lng: number
  color?: string
  popup?: string
  radius?: number
}

type Props = {
  points?: MapPoint[]
  selected?: { lat: number; lng: number } | null
  onPick?: (lat: number, lng: number) => void
  onPointClick?: (id: number) => void
  className?: string
}

const INDIA: [number, number] = [22.5, 79]

type LeafletModule = typeof import('leaflet')

export default function MapView({ points = [], selected, onPick, onPointClick, className = 'h-80' }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const leaflet = useRef<LeafletModule | null>(null)
  const map = useRef<LeafletMap | null>(null)
  const layer = useRef<LayerGroup | null>(null)
  const fitted = useRef(false)
  const handlers = useRef({ onPick, onPointClick })
  const [ready, setReady] = useState(false)

  handlers.current = { onPick, onPointClick }

  useEffect(() => {
    let cancelled = false

    import('leaflet').then((mod) => {
      const L = ((mod as unknown as { default?: LeafletModule }).default ?? mod) as LeafletModule
      if (cancelled || !container.current || map.current) return

      const m = L.map(container.current, { scrollWheelZoom: false }).setView(INDIA, 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(m)
      m.on('click', (e: LeafletMouseEvent) => handlers.current.onPick?.(e.latlng.lat, e.latlng.lng))

      leaflet.current = L
      layer.current = L.layerGroup().addTo(m)
      map.current = m
      setReady(true)
    })

    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const L = leaflet.current
    const m = map.current
    const group = layer.current
    if (!ready || !L || !m || !group) return

    group.clearLayers()

    for (const p of points) {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: p.radius ?? 9,
        color: '#fff',
        weight: 2,
        fillColor: p.color ?? '#197d4f',
        fillOpacity: p.radius ? 0.6 : 0.9,
      }).addTo(group)
      if (p.popup) {
        const text = document.createElement('div')
        text.textContent = p.popup
        marker.bindPopup(text)
      }
      marker.on('click', () => handlers.current.onPointClick?.(p.id))
    }

    if (selected) {
      L.circleMarker([selected.lat, selected.lng], {
        radius: 11,
        color: '#fff',
        weight: 3,
        fillColor: '#dc2626',
        fillOpacity: 1,
      }).addTo(group)
      m.setView([selected.lat, selected.lng], Math.max(m.getZoom(), 16))
    } else if (points.length && !fitted.current) {
      fitted.current = true
      if (points.length === 1) {
        m.setView([points[0].lat, points[0].lng], 15)
      } else {
        m.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.2))
      }
    }
  }, [ready, points, selected])

  return <div ref={container} className={`z-0 w-full overflow-hidden rounded-xl border border-stone-200 ${className}`} />
}

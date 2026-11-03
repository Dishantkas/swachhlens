type Bar = { label: string; value: number; color?: string }

export default function BarChart({ data, horizontal }: { data: Bar[]; horizontal?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value))

  if (horizontal) {
    return (
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 capitalize text-stone-600">{d.label}</span>
            <div className="h-3 flex-1 rounded-full bg-stone-100">
              <div
                className="h-3 rounded-full"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? '#279c63' }}
              />
            </div>
            <span className="w-8 text-right font-medium">{d.value}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-stone-500">No data yet.</p>}
      </div>
    )
  }

  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-medium text-stone-600">{d.value}</span>
          <div
            className="w-full rounded-t-md bg-brand-500"
            style={{ height: `${Math.max((d.value / max) * 100, 2)}px` }}
          />
          <span className="text-[10px] text-stone-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

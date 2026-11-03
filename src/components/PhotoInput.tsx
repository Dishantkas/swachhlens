'use client'

import { useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { compressPhoto } from '@/lib/compress'

type Props = {
  value: string | null
  onChange: (dataUrl: string | null) => void
  label?: string
  disabled?: boolean
}

export default function PhotoInput({ value, onChange, label = 'Add a photo', disabled }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      onChange(await compressPhoto(file))
    } catch {
      setError('Could not read this image. Please try another one.')
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-stone-200">
          <img src={value} alt="Selected photo" className="max-h-96 w-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="btn-outline absolute bottom-3 right-3 bg-white/90"
            >
              <ImagePlus size={16} /> Change
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-12 text-stone-500 transition hover:border-brand-400 hover:text-brand-700"
        >
          <Camera size={32} />
          <span className="font-medium">{label}</span>
          <span className="text-xs">Take a picture or choose one from your gallery</span>
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}

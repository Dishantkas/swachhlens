'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-20 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-stone-600">Please try again in a moment.</p>
      <button onClick={reset} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  )
}

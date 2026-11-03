'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Ban, Trash2 } from 'lucide-react'
import { deleteReport, rejectReport } from '@/app/actions/admin'

export default function AdminActions({ id, status }: { id: number; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function run(action: 'reject' | 'delete') {
    const question =
      action === 'reject'
        ? 'Reject this report? The reporter loses the points they earned for it.'
        : 'Delete this report permanently?'
    if (!window.confirm(question)) return

    setBusy(true)
    const res = action === 'reject' ? await rejectReport(id) : await deleteReport(id)
    setBusy(false)
    if (!res.ok) window.alert(res.error)
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1">
      {(status === 'pending' || status === 'claimed') && (
        <button onClick={() => run('reject')} disabled={busy} className="btn-outline px-2 py-1.5" title="Reject">
          <Ban size={14} />
        </button>
      )}
      <button onClick={() => run('delete')} disabled={busy} className="btn-danger px-2 py-1.5" title="Delete">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Ban, Check, Trash2, Undo2 } from 'lucide-react'
import { approveCollection, declineCollection, deleteReport, rejectReport } from '@/app/actions/admin'

type Action = 'reject' | 'delete' | 'approve' | 'decline'

const questions: Record<Action, string> = {
  reject: 'Reject this report? The reporter loses the points they earned for it.',
  delete: 'Delete this report permanently?',
  approve: 'Approve this clean-up? The collector gets their points.',
  decline: 'Decline this clean-up? The report goes back to the open list.',
}

const run: Record<Action, (id: number) => Promise<{ ok: boolean; error?: string }>> = {
  reject: rejectReport,
  delete: deleteReport,
  approve: approveCollection,
  decline: declineCollection,
}

export default function AdminActions({ id, status }: { id: number; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handle(action: Action) {
    if (!window.confirm(questions[action])) return
    setBusy(true)
    const res = await run[action](id).catch(() => ({ ok: false, error: 'Network problem.' }))
    setBusy(false)
    if (!res.ok) window.alert(res.error ?? 'Something went wrong.')
    router.refresh()
  }

  return (
    <div className="flex justify-end gap-1">
      {status === 'review' && (
        <>
          <button onClick={() => handle('approve')} disabled={busy} className="btn-primary px-2 py-1.5" title="Approve clean-up">
            <Check size={14} />
          </button>
          <button onClick={() => handle('decline')} disabled={busy} className="btn-outline px-2 py-1.5" title="Decline clean-up">
            <Undo2 size={14} />
          </button>
        </>
      )}
      {(status === 'pending' || status === 'claimed') && (
        <button onClick={() => handle('reject')} disabled={busy} className="btn-outline px-2 py-1.5" title="Reject">
          <Ban size={14} />
        </button>
      )}
      <button onClick={() => handle('delete')} disabled={busy} className="btn-danger px-2 py-1.5" title="Delete">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

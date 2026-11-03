import { db } from '@/lib/db'
import { photoFromDataUrl } from '@/lib/images'
import { getUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 })

  const search = new URL(request.url).searchParams
  const after = search.get('v') === 'after'
  // Admins can also see photos of rejected reports.
  const includeRejected = search.get('any') === '1' && Boolean((await getUser())?.isAdmin)

  const sql = await db()
  const [row] = after
    ? await sql`SELECT after_photo AS photo, status FROM reports WHERE id = ${id}`
    : await sql`SELECT photo, status FROM reports WHERE id = ${id}`

  if (!row || (row.status === 'rejected' && !includeRejected)) return new Response('Not found', { status: 404 })
  const image = row.photo ? photoFromDataUrl(row.photo) : null
  if (!image) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(Buffer.from(image.base64, 'base64')), {
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': includeRejected ? 'private, max-age=3600' : 'public, max-age=86400, immutable',
    },
  })
}

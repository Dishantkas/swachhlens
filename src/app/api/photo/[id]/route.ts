import { db } from '@/lib/db'
import { photoFromDataUrl } from '@/lib/images'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 })

  const after = new URL(request.url).searchParams.get('v') === 'after'
  const sql = await db()
  const [row] = after
    ? await sql`SELECT after_photo AS photo FROM reports WHERE id = ${id} AND status <> 'rejected'`
    : await sql`SELECT photo FROM reports WHERE id = ${id} AND status <> 'rejected'`

  const image = row?.photo ? photoFromDataUrl(row.photo) : null
  if (!image) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(Buffer.from(image.base64, 'base64')), {
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}

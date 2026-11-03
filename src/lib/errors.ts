export class UserError extends Error {}

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

export async function attempt<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (err) {
    if (err instanceof UserError) return { ok: false, error: err.message }
    console.error(err)
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

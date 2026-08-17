/**
 * Minimal Replicate client. Requests go through the Vite dev proxy at
 * `/replicate` because api.replicate.com sends no CORS headers.
 */

const BASE = '/replicate/v1'

export type Prediction = {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output: unknown
  error: string | null
  logs?: string
  model?: string
  version?: string
  created_at?: string
  started_at?: string
  completed_at?: string
  /**
   * Billing-adjacent, but not a cost: Replicate bills hardware time and does not
   * report a per-prediction charge, so these seconds are all there is to show.
   */
  metrics?: { predict_time?: number; total_time?: number }
}

/** Replicate's own page for a single run. */
export function predictionUrl(id: string) {
  return `https://replicate.com/p/${id}`
}

async function call(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.detail || body?.title || `Replicate error ${res.status}`)
  }
  return body
}

export type Account = {
  type: 'user' | 'organization'
  username: string
  name: string
  github_url?: string
}

/** Verifies a token by hitting an endpoint that requires auth. */
export async function verifyToken(token: string) {
  await call(token, '/account')
}

export function getAccount(token: string): Promise<Account> {
  return call(token, '/account')
}

export type PredictionSummary = {
  id: string
  model: string
  status: Prediction['status']
  created_at: string
  completed_at: string | null
  metrics?: { predict_time?: number; total_time?: number }
}

/** Rewrites an absolute Replicate URL onto the local proxy path. */
function toProxyPath(url: string) {
  const parsed = new URL(url)
  return `${parsed.pathname.replace(/^\/v1/, '')}${parsed.search}`
}

/**
 * Walks the prediction history. Replicate paginates at 100 per page, so this is
 * capped — usage figures are labelled as covering the fetched window.
 */
export async function listPredictions(token: string, maxPages = 5) {
  const results: PredictionSummary[] = []
  let path: string | null = '/predictions'
  let pages = 0

  while (path && pages < maxPages) {
    const body = await call(token, path)
    results.push(...((body?.results ?? []) as PredictionSummary[]))
    path = body?.next ? toProxyPath(body.next as string) : null
    pages++
  }

  return { predictions: results, complete: path === null }
}

const versionCache = new Map<string, string | null>()

/**
 * Official models are run through the model-scoped endpoint; community models
 * need an explicit version id, so we look one up and cache it.
 */
async function resolveVersion(token: string, slug: string) {
  if (versionCache.has(slug)) return versionCache.get(slug)!
  const model = await call(token, `/models/${slug}`)
  const version = model?.latest_version?.id ?? null
  versionCache.set(slug, version)
  return version
}

export async function createPrediction(
  token: string,
  slug: string,
  input: Record<string, unknown>,
): Promise<Prediction> {
  const version = await resolveVersion(token, slug)
  if (version) {
    return call(token, '/predictions', {
      method: 'POST',
      body: JSON.stringify({ version, input }),
    })
  }
  return call(token, `/models/${slug}/predictions`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

export async function getPrediction(token: string, id: string): Promise<Prediction> {
  return call(token, `/predictions/${id}`)
}

export async function cancelPrediction(token: string, id: string) {
  return call(token, `/predictions/${id}/cancel`, { method: 'POST' })
}

/** Polls until the prediction reaches a terminal state. */
export async function waitForPrediction(
  token: string,
  id: string,
  onUpdate?: (p: Prediction) => void,
  signal?: AbortSignal,
): Promise<Prediction> {
  for (;;) {
    if (signal?.aborted) throw new Error('Cancelled')
    const p = await getPrediction(token, id)
    onUpdate?.(p)
    if (p.status === 'succeeded' || p.status === 'failed' || p.status === 'canceled') return p
    await new Promise((r) => setTimeout(r, 1500))
  }
}

/** Language and captioning models stream text as an array of chunks. */
export function outputText(output: unknown): string {
  if (typeof output === 'string') return output
  if (Array.isArray(output)) return output.filter((o) => typeof o === 'string').join('')
  if (output && typeof output === 'object') {
    const rec = output as Record<string, unknown>
    for (const key of ['text', 'output', 'transcription', 'caption']) {
      if (typeof rec[key] === 'string') return rec[key] as string
    }
  }
  return output == null ? '' : JSON.stringify(output, null, 2)
}

/** Replicate returns either a single URL or an array of them. */
export function firstUrl(output: unknown): string | null {
  if (typeof output === 'string') return output
  if (Array.isArray(output)) {
    const found = output.find((o) => typeof o === 'string')
    return (found as string) ?? null
  }
  if (output && typeof output === 'object') {
    const rec = output as Record<string, unknown>
    for (const key of ['url', 'video', 'image', 'output']) {
      if (typeof rec[key] === 'string') return rec[key] as string
    }
  }
  return null
}

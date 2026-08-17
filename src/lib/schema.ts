/**
 * Reads a model's real input schema from Replicate instead of hardcoding one
 * per model. Replicate publishes an OpenAPI document per version; the `Input`
 * schema in it is what the prediction endpoint accepts.
 */

import type { MediaKind } from './models'

export type FieldType = 'string' | 'text' | 'integer' | 'number' | 'boolean' | 'enum' | 'file'

export type SchemaField = {
  key: string
  title: string
  type: FieldType
  description?: string
  default?: unknown
  options?: (string | number)[]
  min?: number
  max?: number
  required: boolean
  /** Set when the field takes a file URL, so it can be fed by a connection. */
  media?: MediaKind
  /** Set when the field takes a list of file URLs. */
  multiple?: boolean
  order: number
}

export type ModelSchema = {
  slug: string
  /** Field that receives the text prompt, if the model has one. */
  promptKey: string | null
  /** File fields, in schema order. */
  mediaFields: SchemaField[]
  /** Everything else, i.e. the knobs rendered on the node. */
  fields: SchemaField[]
}

type Json = Record<string, unknown>

const PROMPT_KEYS = ['prompt', 'text', 'text_input', 'text_prompt', 'description', 'lyrics', 'query']

const MEDIA_HINTS: [MediaKind, RegExp][] = [
  ['video', /(^|_)(video|clip|footage)($|_)/],
  ['audio', /(^|_)(audio|voice|speech|music|sound|song)($|_)/],
  ['image', /(^|_)(image|img|photo|picture|frame|mask|reference|subject|face)($|_)/],
]

/** Fields that are noise on a canvas node. */
const HIDDEN = new Set([
  'seed',
  'disable_safety_checker',
  'safety_tolerance',
  'go_fast',
  'megapixels',
  'output_quality',
  'apply_watermark',
  'watermark',
])

function guessMedia(key: string, description?: string): MediaKind | undefined {
  const haystack = `_${key.toLowerCase()}_`
  for (const [kind, pattern] of MEDIA_HINTS) {
    if (pattern.test(haystack)) return kind
  }
  const desc = (description ?? '').toLowerCase()
  if (desc.includes('video')) return 'video'
  if (desc.includes('audio')) return 'audio'
  return 'image'
}

/** Resolves `$ref` and `allOf: [{$ref}]` indirection used for enums. */
function deref(prop: Json, schemas: Json): Json {
  let node = prop
  const ref = (node.$ref ?? (Array.isArray(node.allOf) ? (node.allOf[0] as Json)?.$ref : null)) as
    | string
    | null
    | undefined

  if (typeof ref === 'string') {
    const name = ref.split('/').pop() as string
    const target = schemas[name] as Json | undefined
    if (target) node = { ...target, ...node, $ref: undefined, allOf: undefined }
  }
  return node
}

function toField(key: string, raw: Json, schemas: Json, required: Set<string>): SchemaField {
  const prop = deref(raw, schemas)
  const description = prop.description as string | undefined
  const enumValues = prop.enum as (string | number)[] | undefined
  const format = prop.format as string | undefined
  const jsonType = prop.type as string | undefined

  let type: FieldType = 'string'
  let media: MediaKind | undefined
  let multiple = false

  if (format === 'uri') {
    type = 'file'
    media = guessMedia(key, description)
  } else if (jsonType === 'array') {
    const items = deref((prop.items ?? {}) as Json, schemas)
    if (items.format === 'uri') {
      type = 'file'
      media = guessMedia(key, description)
      multiple = true
    }
  } else if (enumValues?.length) {
    type = 'enum'
  } else if (jsonType === 'integer') {
    type = 'integer'
  } else if (jsonType === 'number') {
    type = 'number'
  } else if (jsonType === 'boolean') {
    type = 'boolean'
  } else if (PROMPT_KEYS.includes(key) || (description ?? '').length > 60) {
    type = 'text'
  }

  return {
    key,
    title: (prop.title as string) || key.replace(/_/g, ' '),
    type,
    description,
    default: prop.default,
    options: enumValues,
    min: prop.minimum as number | undefined,
    max: prop.maximum as number | undefined,
    required: required.has(key),
    media,
    multiple,
    order: (prop['x-order'] as number) ?? 999,
  }
}

function parse(slug: string, openapi: Json): ModelSchema {
  const components = (openapi.components ?? {}) as Json
  const schemas = (components.schemas ?? {}) as Json
  const input = (schemas.Input ?? {}) as Json
  const properties = (input.properties ?? {}) as Json
  const required = new Set((input.required as string[] | undefined) ?? [])

  const all = Object.entries(properties)
    .map(([key, raw]) => toField(key, raw as Json, schemas, required))
    .sort((a, b) => a.order - b.order)

  const promptKey = PROMPT_KEYS.find((k) => all.some((f) => f.key === k && f.type !== 'file')) ?? null

  return {
    slug,
    promptKey,
    mediaFields: all.filter((f) => f.type === 'file'),
    fields: all.filter((f) => f.type !== 'file' && f.key !== promptKey && !HIDDEN.has(f.key)),
  }
}

const cache = new Map<string, Promise<ModelSchema | null>>()

async function fetchJson(token: string, path: string) {
  const res = await fetch(`/replicate/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return (await res.json()) as Json
}

/**
 * Returns the normalized input schema for a model, or null when Replicate does
 * not expose one (in which case the node falls back to prompt-only input).
 */
export function loadSchema(token: string, slug: string): Promise<ModelSchema | null> {
  const cached = cache.get(slug)
  if (cached) return cached

  const promise = (async () => {
    const model = await fetchJson(token, `/models/${slug}`)
    const latest = model?.latest_version as Json | undefined
    let openapi = latest?.openapi_schema as Json | undefined

    // Official models sometimes omit the schema on the model object.
    if (!openapi) {
      const versions = await fetchJson(token, `/models/${slug}/versions`)
      const first = (versions?.results as Json[] | undefined)?.[0]
      openapi = first?.openapi_schema as Json | undefined
    }

    return openapi ? parse(slug, openapi) : null
  })().catch(() => null)

  cache.set(slug, promise)
  return promise
}

/** Picks the media field an upstream node of `kind` should feed. */
export function fieldForMedia(schema: ModelSchema | null, kind: MediaKind) {
  if (!schema) return null
  return schema.mediaFields.find((f) => f.media === kind) ?? null
}

import { Handle, Position, type NodeProps } from '@xyflow/react'
import {
  AlertCircle,
  AudioLines,
  Box,
  ChevronDown,
  Download,
  FileText,
  Image as ImageIcon,
  Link2,
  Loader2,
  Play,
  Video,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { InputHandle } from './InputHandle'
import { NodeShell } from './NodeShell'
import { Zoomable } from './Zoomable'
import { Button } from '@/components/ui/button'
import {
  getModel,
  modelUrl,
  priceFor,
  type MediaKind,
  type ModelDef,
  type OutputKind,
} from '@/lib/models'
import {
  assetKey,
  blobToDataUrl,
  buildFilename,
  cacheAsset,
  extensionFor,
  getAsset,
  recordGeneration,
  saveToDisk,
} from '@/lib/projects'
import {
  createPrediction,
  firstUrl,
  outputText,
  predictionUrl,
  waitForPrediction,
} from '@/lib/replicate'
import { loadSchema, type ModelSchema, type SchemaField } from '@/lib/schema'
import { cn } from '@/lib/utils'
import {
  useStore,
  type AppNode,
  type GenNodeData,
  type RunInfo,
  type Upstream,
  type UpstreamMedia,
} from '@/store'

type Props = NodeProps<Extract<AppNode, { type: 'gen' }>>

const ICONS: Record<OutputKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: AudioLines,
  model3d: Box,
  text: FileText,
}

const OUTPUT_LABEL: Record<OutputKind, string> = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  model3d: '3D',
  text: 'Text',
}

export function GenNode({ id, data, selected }: Props) {
  const updateNode = useStore((s) => s.updateNode)
  const resolveUpstream = useStore((s) => s.resolveUpstream)
  const registerAsset = useStore((s) => s.registerAsset)
  const openPreview = useStore((s) => s.openPreview)
  const apiKey = useStore((s) => s.apiKey)
  const cachedUrl = useStore((s) => (data.assetKey ? s.assetUrls[data.assetKey] : undefined))

  // Selected as separate primitives so this node re-renders when an upstream
  // node changes — React Flow only re-renders nodes whose own data changed.
  const upstreamPrompt = useStore((s) => s.resolveUpstream(id).prompt)
  // Compared as a string so a fresh array of sources each call doesn't re-render.
  const sourceSignature = useStore((s) => signature(s.resolveUpstream(id).sources))
  const sources = useMemo(
    () => resolveUpstream(id).sources,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceSignature, id, resolveUpstream],
  )

  const [schema, setSchema] = useState<ModelSchema | null>(null)
  const [schemaState, setSchemaState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [showSettings, setShowSettings] = useState(false)

  const model = getModel(data.modelId)

  // The field list comes from Replicate, so it always matches the live model.
  useEffect(() => {
    if (!apiKey || !model) return
    setSchemaState('loading')
    let cancelled = false
    loadSchema(apiKey, model.id).then((result) => {
      if (cancelled) return
      setSchema(result)
      setSchemaState('done')
    })
    return () => {
      cancelled = true
    }
  }, [apiKey, model])

  const run = useCallback(async () => {
    const { apiKey: token, projectId } = useStore.getState()
    if (!model) return
    if (!token) {
      updateNode(id, { status: 'failed', error: 'Add your Replicate API key first (top right).' })
      return
    }

    const upstream = await materializeMedia(resolveUpstream(id))
    const input = buildInput(schema, data, upstream)

    if (schema?.promptKey && !input[schema.promptKey]) {
      updateNode(id, { status: 'failed', error: 'Connect a prompt node or type a prompt.' })
      return
    }

    updateNode(id, { status: 'running', error: null, outputUrl: null, outputText: null })
    try {
      const created = await createPrediction(token, model.id, input)
      updateNode(id, { predictionId: created.id })
      const done = await waitForPrediction(token, created.id)

      if (done.status !== 'succeeded') {
        updateNode(id, { status: 'failed', error: done.error || `Prediction ${done.status}` })
        return
      }

      // Replicate reports no charge per prediction, so "cost" here is time.
      const run: RunInfo = {
        predictionId: created.id,
        predictTime: done.metrics?.predict_time,
        totalTime: done.metrics?.total_time,
        startedAt: done.started_at ? Date.parse(done.started_at) : undefined,
        completedAt: done.completed_at ? Date.parse(done.completed_at) : undefined,
      }

      if (model.outputKind === 'text') {
        updateNode(id, {
          status: 'succeeded',
          outputText: outputText(done.output),
          error: null,
          run,
        })
        return
      }

      const url = firstUrl(done.output)
      updateNode(id, { status: 'succeeded', outputUrl: url, error: null, run })

      // Keep a local copy so the result survives the delivery URL expiring.
      if (url) {
        const key = assetKey(projectId, id, created.id)
        const blob = await cacheAsset(key, url)
        if (!blob) return

        registerAsset(key, blob)
        updateNode(id, { assetKey: key })

        const filename = buildFilename(model.name, created.id, extensionFor(url, blob))
        // Size and dimensions come from the file itself, not the API.
        updateNode(id, {
          run: { ...run, bytes: blob.size, filename, ...(await imageSize(blob, model.outputKind)) },
        })
        const { title, autoDownload, refreshGallery } = useStore.getState()
        await recordGeneration({
          key,
          projectId,
          projectTitle: title,
          nodeId: id,
          modelId: model.id,
          modelName: model.name,
          kind: model.outputKind,
          filename,
          remoteUrl: url,
          createdAt: Date.now(),
        })
        refreshGallery()

        if (autoDownload) saveToDisk(blob, filename)
      }
    } catch (err) {
      updateNode(id, { status: 'failed', error: (err as Error).message })
    }
  }, [data, id, model, registerAsset, resolveUpstream, schema, updateNode])

  if (!model) return null

  const Icon = ICONS[model.outputKind]
  const assigned = assignSources(schema?.mediaFields ?? [], sources)
  const running = data.status === 'running'
  const displayUrl = cachedUrl ?? data.outputUrl
  const setInput = (key: string, value: unknown) =>
    updateNode(id, { inputs: { ...data.inputs, [key]: value } })

  return (
    <NodeShell
      id={id}
      title={model.name}
      subtitle={model.id}
      badge={priceFor(model.id)}
      info={<RunDetails model={model} status={data.status} run={data.run} />}
      selected={selected}
      width={300}
      icon={<Icon className="size-3.5" />}
    >
      <div className="space-y-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground">
          {model.note && <span>{model.note} · </span>}
          <a
            href={modelUrl(model.id)}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition-colors duration-150 hover:text-foreground"
          >
            {priceFor(model.id) ? 'Model page' : 'Pricing on Replicate'}
          </a>
        </p>

        {(!schema || schema.promptKey) && (
          <PromptField
            connected={upstreamPrompt}
            value={data.prompt}
            onChange={(v) => updateNode(id, { prompt: v })}
          />
        )}

        {schema?.mediaFields.map((field) => (
          <MediaField
            key={field.key}
            field={field}
            connected={assigned.get(field.key)}
            value={(data.inputs[field.key] as string) ?? ''}
            onChange={(v) => setInput(field.key, v)}
          />
        ))}

        {schemaState === 'loading' && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Loading model inputs…
          </p>
        )}

        {schemaState === 'done' && !schema && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            Replicate did not publish an input schema for this model. Only the prompt is sent.
          </p>
        )}

        {!!schema?.fields.length && (
          <div className="rounded-md border border-border">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] tracking-wide text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground"
            >
              Settings
              <ChevronDown
                className={cn('size-3.5 transition-transform duration-150', showSettings && 'rotate-180')}
              />
            </button>
            {showSettings && (
              <div className="nowheel scroll-thin max-h-64 space-y-2 overflow-y-auto border-t border-border p-2.5">
                {schema.fields.map((field) => (
                  <Field
                    key={field.key}
                    field={field}
                    value={data.inputs[field.key]}
                    onChange={(v) => setInput(field.key, v)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <Output
          kind={model.outputKind}
          url={displayUrl}
          text={data.outputText}
          running={running}
          onZoom={(url) =>
            openPreview({
              url,
              kind: model.outputKind === 'video' ? 'video' : 'image',
              title: model.name,
            })
          }
        />

        <div className="flex items-center gap-2">
          <Button onClick={run} disabled={running} size="sm" className="flex-1">
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            {running ? 'Generating…' : 'Generate'}
          </Button>
          {displayUrl && (
            <Button asChild variant="secondary" size="sm">
              <a href={displayUrl} target="_blank" rel="noreferrer" download>
                <Download />
              </a>
            </Button>
          )}
        </div>

        {data.error && (
          <div className="flex items-start gap-1.5 text-[11px] leading-snug text-red-400">
            <AlertCircle className="mt-px size-3 shrink-0" />
            <span>{data.error}</span>
          </div>
        )}
      </div>

      {/*
        Inputs live beside the field they feed (see PromptField / MediaField).
        This one is kept, invisible, so edges saved before inputs were split per
        field still have a target to resolve against.
      */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle type="source" position={Position.Right} id="out" />
      <span className="pointer-events-none absolute top-1/2 -right-14 -translate-y-1/2 font-mono text-[10px] text-connector">
        {OUTPUT_LABEL[model.outputKind]}
      </span>
    </NodeShell>
  )
}

/**
 * What we can honestly report about a run. Replicate's API returns no charge for
 * a prediction and publishes no pricing, so the price line is the rate listed on
 * replicate.com when we know it — labelled as such, never presented as a bill.
 */
function RunDetails({
  model,
  status,
  run,
}: {
  model: ModelDef
  status: GenNodeData['status']
  run: RunInfo | null
}) {
  const price = priceFor(model.id)

  return (
    <div className="space-y-2">
      <div>
        <div className="text-[12px] leading-tight">{model.name}</div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">{model.id}</div>
      </div>

      <dl className="space-y-1">
        <Detail label="Status" value={status} />
        <Detail
          label="Listed price"
          value={price ?? 'not published'}
          hint={
            price
              ? 'Rate on replicate.com, per output. Replicate bills separately — this is not a charge for this run.'
              : 'Replicate publishes no pricing through its API, so nothing is shown rather than a guess.'
          }
        />
        {run ? (
          <>
            <Detail label="Model time" value={formatSeconds(run.predictTime)} />
            <Detail
              label="Total time"
              value={formatSeconds(run.totalTime)}
              hint="Includes cold-boot and queue wait, which is what hardware-billed models charge for."
            />
            {run.width && run.height && (
              <Detail label="Dimensions" value={`${run.width} × ${run.height}`} />
            )}
            <Detail label="File size" value={formatBytes(run.bytes)} />
            {run.completedAt && (
              <Detail label="Finished" value={new Date(run.completedAt).toLocaleString()} />
            )}
            <Detail label="Prediction" value={run.predictionId} mono />
          </>
        ) : (
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
            Run this node to see timings and output details.
          </p>
        )}
      </dl>

      <div className="flex gap-3 border-t border-border pt-2 text-[11px]">
        <a
          href={modelUrl(model.id)}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline underline-offset-2 transition-colors duration-150 hover:text-foreground"
        >
          Model page
        </a>
        {run && (
          <a
            href={predictionUrl(run.predictionId)}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground underline underline-offset-2 transition-colors duration-150 hover:text-foreground"
          >
            This run on Replicate
          </a>
        )}
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  hint,
  mono,
}: {
  label: string
  value: string
  hint?: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2" title={hint}>
      <dt className="shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 flex-1 truncate text-right text-[11px]',
          mono && 'font-mono text-[10px]',
        )}
      >
        {value}
      </dd>
    </div>
  )
}

function formatSeconds(seconds?: number) {
  if (seconds === undefined) return 'unknown'
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

function formatBytes(bytes?: number) {
  if (bytes === undefined) return 'unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Stable identity for a set of upstream sources, for cheap selector comparison. */
function signature(sources: UpstreamMedia[]) {
  return sources.map((s) => `${s.handle ?? ''}|${s.kind}|${s.url}|${s.assetKey ?? ''}`).join('~')
}

/** Pixel dimensions of an image output; nothing for other kinds. */
async function imageSize(blob: Blob, kind: OutputKind) {
  if (kind !== 'image') return {}
  try {
    const bitmap = await createImageBitmap(blob)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return {}
  }
}

/**
 * Replicate cannot fetch a `blob:` URL, which is what locally produced output
 * (an effect result) looks like, so those become data URIs before being sent.
 */
async function materializeMedia(upstream: Upstream): Promise<Upstream> {
  const sources = await Promise.all(
    upstream.sources.map(async (source) => {
      if (source.url && !source.url.startsWith('blob:')) return source
      const blob = source.assetKey ? await getAsset(source.assetKey) : null
      return { ...source, url: blob ? await blobToDataUrl(blob) : '' }
    }),
  )

  const media: Partial<Record<MediaKind, string>> = {}
  for (const source of sources) {
    if (source.url && !media[source.kind]) media[source.kind] = source.url
  }

  return { ...upstream, media, sources: sources.filter((s) => s.url) }
}

/**
 * Forces a stored value back to the JSON type the schema declares. Saved
 * projects can hold a stringified number from an enum control, and Replicate
 * rejects those outright ("expected number, got string").
 */
function coerceToSchema(field: SchemaField | undefined, value: unknown): unknown {
  if (!field) return value

  const numericEnum =
    field.type === 'enum' && !!field.options?.length && field.options.every((o) => typeof o === 'number')
  const wantsNumber = field.type === 'integer' || field.type === 'number' || numericEnum

  if (wantsNumber && typeof value === 'string') {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return value
    return field.type === 'integer' ? Math.round(parsed) : parsed
  }

  if (field.type === 'boolean' && typeof value === 'string') return value === 'true'

  return value
}

/** Connected prompt first, then the node's own addition, on its own line. */
export function joinPrompt(connected: string, own: string) {
  return [connected, own]
    .map((part) => part.trim())
    .filter(Boolean)
    .join('\n')
}

/** Merges schema defaults, node overrides, the prompt and upstream media. */
function buildInput(
  schema: ModelSchema | null,
  data: Extract<AppNode, { type: 'gen' }>['data'],
  upstream: Upstream,
): Record<string, unknown> {
  const input: Record<string, unknown> = {}
  const byKey = new Map((schema?.fields ?? []).map((f) => [f.key, f]))

  // Replicate applies its own defaults, so only send what the user changed.
  for (const [key, value] of Object.entries(data.inputs)) {
    if (value !== '' && value !== undefined && value !== null) {
      input[key] = coerceToSchema(byKey.get(key), value)
    }
  }

  const promptKey = schema?.promptKey ?? 'prompt'
  // A connected prompt node does not replace what's typed on the node — the two
  // are joined, so a template can be extended with "red hair" here.
  const prompt = joinPrompt(upstream.prompt, data.prompt)
  if (prompt) input[promptKey] = prompt

  const assigned = assignSources(schema?.mediaFields ?? [], upstream.sources)
  for (const field of schema?.mediaFields ?? []) {
    if (input[field.key]) continue
    const url = assigned.get(field.key)?.url
    if (!url) continue
    input[field.key] = field.multiple ? [url] : url
  }

  return input
}

/**
 * Works out which upstream file feeds which media input. An edge dropped on a
 * field's own handle claims that field; anything left on the generic input fills
 * the remaining fields of a matching kind, in edge order — so two image nodes
 * become first frame and last frame without any wiring precision.
 */
export function assignSources(fields: SchemaField[], sources: UpstreamMedia[]) {
  const byField = new Map<string, UpstreamMedia>()
  const used = new Set<UpstreamMedia>()
  const fieldKeys = new Set(fields.map((f) => f.key))

  for (const field of fields) {
    const exact = sources.find((s) => !used.has(s) && s.handle === field.key)
    if (exact) {
      byField.set(field.key, exact)
      used.add(exact)
    }
  }

  for (const field of fields) {
    if (byField.has(field.key)) continue
    // A handle that no longer matches any field (the model changed its schema)
    // is treated as generic rather than silently dropped.
    const next = sources.find(
      (s) => !used.has(s) && s.kind === field.media && (!s.handle || !fieldKeys.has(s.handle)),
    )
    if (next) {
      byField.set(field.key, next)
      used.add(next)
    }
  }

  return byField
}

function PromptField({
  connected,
  value,
  onChange,
}: {
  connected: string
  value: string
  onChange: (v: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative">
      <InputHandle id="prompt" title="Connect a prompt node" />
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Prompt</span>
        {connected && <span className="font-mono text-[10px] text-connector">connected</span>}
      </div>
      {connected ? (
        <PromptConnected
          connected={connected}
          value={value}
          onChange={onChange}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Prompt, or connect a prompt node…"
          rows={3}
          className="nowheel scroll-thin w-full resize-none rounded-md border border-border bg-card p-2.5 text-[12px] leading-relaxed outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-border-active"
        />
      )}
    </div>
  )
}

/** The connected form: the upstream text, plus room to add to it. */
function PromptConnected({
  connected,
  value,
  onChange,
  expanded,
  onToggle,
}: {
  connected: string
  value: string
  onChange: (v: string) => void
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-md border border-border bg-card p-2.5">
        <p
          className={cn(
            'text-[12px] leading-relaxed text-muted-foreground',
            expanded ? 'nowheel scroll-thin max-h-40 overflow-y-auto' : 'line-clamp-3',
          )}
        >
          {connected}
        </p>
        {connected.length > 150 && (
          <button
            onClick={onToggle}
            className="mt-1 font-mono text-[10px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
          >
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </div>

      {/* Typed here, this is appended to the connected prompt rather than ignored. */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add to it — e.g. red hair, warmer light…"
        rows={2}
        className="nowheel scroll-thin w-full resize-none rounded-md border border-border bg-card p-2.5 text-[12px] leading-relaxed outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-border-active"
      />
      {value.trim() && (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Sent as the connected prompt, then your addition on a new line.
        </p>
      )}
    </div>
  )
}

/**
 * One media input, with its own target handle so an edge can be dropped straight
 * onto it. That is what makes first-frame / last-frame wiring possible: the
 * handle id is the schema field key, and the edge remembers it.
 */
function MediaField({
  field,
  connected,
  value,
  onChange,
}: {
  field: SchemaField
  connected?: UpstreamMedia
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <InputHandle id={field.key} title={`Connect a ${field.media ?? 'file'} for ${field.title}`} />
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {field.title}
        </span>
        {field.required && <span className="text-[10px] text-accent">required</span>}
      </div>
      {connected && !value ? (
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-card p-1.5 text-[11px] text-muted-foreground">
          {connected.kind === 'image' && connected.url ? (
            <img
              src={connected.url}
              alt=""
              className="size-8 shrink-0 rounded border border-border object-cover"
            />
          ) : (
            <Link2 className="size-3 shrink-0 text-connector" />
          )}
          <span className="truncate">
            Connected {connected.kind}
            {connected.handle === field.key ? '' : ' (auto)'}
          </span>
        </div>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${field.media ?? 'file'} URL, or connect a node`}
          className="h-7 w-full rounded-md border border-border bg-card px-2 text-[12px] outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-border-active"
        />
      )}
    </div>
  )
}

function Field({
  field,
  value,
  onChange,
}: {
  field: SchemaField
  value: unknown
  onChange: (v: unknown) => void
}) {
  const current = value ?? field.default ?? ''

  if (field.type === 'boolean') {
    return (
      <label className="flex items-center gap-2" title={field.description}>
        <input
          type="checkbox"
          checked={Boolean(current)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-3.5 accent-[var(--accent-dim)]"
        />
        <span className="text-[12px]">{field.title}</span>
      </label>
    )
  }

  return (
    <label className="block" title={field.description}>
      <span className="mb-1 block text-[10px] tracking-wide text-muted-foreground uppercase">
        {field.title}
      </span>
      {field.type === 'enum' ? (
        <select
          value={String(current)}
          onChange={(e) => {
            // Enum options can be numbers; a select only ever yields strings, so
            // map back to the original option to keep the type Replicate expects.
            const match = field.options?.find((opt) => String(opt) === e.target.value)
            onChange(match ?? e.target.value)
          }}
          className="h-7 w-full rounded-md border border-border bg-card px-1.5 text-[12px] outline-none transition-colors duration-150 focus:border-border-active"
        >
          {field.options?.map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      ) : field.type === 'integer' || field.type === 'number' ? (
        <input
          type="number"
          value={String(current)}
          min={field.min}
          max={field.max}
          step={field.type === 'integer' ? 1 : 'any'}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-7 w-full rounded-md border border-border bg-card px-2 text-[12px] outline-none transition-colors duration-150 focus:border-border-active"
        />
      ) : field.type === 'text' ? (
        <textarea
          value={String(current)}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
          className="nowheel scroll-thin w-full resize-none rounded-md border border-border bg-card p-2 text-[12px] outline-none transition-colors duration-150 focus:border-border-active"
        />
      ) : (
        <input
          value={String(current)}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-full rounded-md border border-border bg-card px-2 text-[12px] outline-none transition-colors duration-150 focus:border-border-active"
        />
      )}
    </label>
  )
}

function Output({
  kind,
  url,
  text,
  running,
  onZoom,
}: {
  kind: OutputKind
  url: string | null
  text: string | null
  running: boolean
  onZoom: (url: string) => void
}) {
  if (running) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-border bg-card">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (kind === 'text') {
    return (
      <div className="nowheel scroll-thin max-h-40 overflow-y-auto rounded-md border border-border bg-card p-2.5 text-[12px] leading-relaxed">
        {text || <span className="text-muted-foreground">No output yet</span>}
      </div>
    )
  }

  if (!url) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-card text-[11px] text-muted-foreground">
        No output yet
      </div>
    )
  }

  if (kind === 'audio') {
    return <audio src={url} controls className="w-full" />
  }

  if (kind === 'model3d') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-md border border-border bg-card text-[11px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
      >
        <Box className="size-5" />
        Open 3D model
      </a>
    )
  }

  return (
    <Zoomable url={url} onZoom={onZoom}>
      {kind === 'video' ? (
        <video src={url} controls loop className="w-full" />
      ) : (
        <img
          src={url}
          alt=""
          onClick={() => onZoom(url)}
          className="w-full cursor-zoom-in"
        />
      )}
    </Zoomable>
  )
}

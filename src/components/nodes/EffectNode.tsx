import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AlertCircle, Download, Link2, Loader2, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { InputHandle } from './InputHandle'
import { Zoomable } from './Zoomable'
import { NodeShell } from './NodeShell'
import { Button } from '@/components/ui/button'
import { getEffect, runEffect, type EffectParam } from '@/lib/effects'
import {
  buildFilename,
  getAsset,
  putAsset,
  recordGeneration,
  saveToDisk,
} from '@/lib/projects'
import { useStore, type AppNode } from '@/store'

type Props = NodeProps<Extract<AppNode, { type: 'effect' }>>

/** Effects run locally, so the result overwrites one stable key per node. */
const keyFor = (projectId: string, nodeId: string) => `${projectId}:${nodeId}:effect`

export function EffectNode({ id, data, selected }: Props) {
  const updateNode = useStore((s) => s.updateNode)
  const registerAsset = useStore((s) => s.registerAsset)
  const openPreview = useStore((s) => s.openPreview)
  const outputUrl = useStore((s) => (data.assetKey ? s.assetUrls[data.assetKey] : undefined))

  // Effects need pixel access, so they work from the cached blob, not the URL.
  const sourceKey = useStore((s) => s.resolveUpstream(id).mediaAssets.image)
  const sourceUrl = useStore(useShallow((s) => s.resolveUpstream(id).media.image))

  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const effect = getEffect(data.effectId)

  // Re-apply whenever the parameters or the upstream image change.
  useEffect(() => {
    if (!effect || (!sourceKey && !sourceUrl)) return

    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const { projectId, title } = useStore.getState()
      setBusy(true)
      try {
        const source = await loadSource(sourceKey, sourceUrl)
        if (!source) throw new Error('Could not read the upstream image')

        const result = await runEffect(data.effectId, data.params, source)
        const key = keyFor(projectId, id)

        await putAsset(key, result)
        registerAsset(key, result)
        updateNode(id, { status: 'succeeded', assetKey: key, error: null })

        await recordGeneration({
          key,
          projectId,
          projectTitle: title,
          nodeId: id,
          modelId: `effect/${data.effectId}`,
          modelName: effect.name,
          kind: 'image',
          filename: buildFilename(effect.name, id, 'png'),
          remoteUrl: '',
          createdAt: Date.now(),
        })
        useStore.getState().refreshGallery()
      } catch (err) {
        updateNode(id, { status: 'failed', error: (err as Error).message })
      } finally {
        setBusy(false)
      }
    }, 250)

    return () => clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.effectId, data.params, sourceKey, sourceUrl, effect, id])

  if (!effect) return null

  const hasSource = Boolean(sourceKey || sourceUrl)
  const setParam = (key: string, value: string | number | boolean) =>
    updateNode(id, { params: { ...data.params, [key]: value } })

  return (
    <NodeShell
      id={id}
      title={effect.name}
      subtitle="local effect"
      selected={selected}
      width={280}
      icon={<Wand2 className="size-3.5" />}
    >
      <div className="space-y-2.5">
        <p className="text-[11px] leading-snug text-muted-foreground">{effect.description}</p>

        <div className="relative">
          <InputHandle id="image" title="Connect an image" />
          <div className="mb-1 flex items-center gap-1.5">
            <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Image</span>
            {hasSource && <span className="font-mono text-[10px] text-connector">connected</span>}
          </div>
          {hasSource ? (
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-card p-1.5 text-[11px] text-muted-foreground">
              {sourceUrl ? (
                <img
                  src={sourceUrl}
                  alt=""
                  className="size-8 shrink-0 rounded border border-border object-cover"
                />
              ) : (
                <Link2 className="size-3 shrink-0 text-connector" />
              )}
              <span className="truncate">Source image</span>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-card px-2.5 py-2 text-[11px] text-muted-foreground">
              Connect an image to apply this effect.
            </div>
          )}
        </div>

        <div className="space-y-2">
          {effect.params.map((param) => (
            <ParamControl
              key={param.key}
              param={param}
              value={data.params[param.key]}
              onChange={(v) => setParam(param.key, v)}
            />
          ))}
        </div>

        {busy ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-border bg-card">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : outputUrl ? (
          <Zoomable
            url={outputUrl}
            onZoom={(url) => openPreview({ url, kind: 'image', title: effect.name })}
          >
            <img
              src={outputUrl}
              alt=""
              onClick={() => openPreview({ url: outputUrl, kind: 'image', title: effect.name })}
              className="w-full cursor-zoom-in"
            />
          </Zoomable>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border bg-card text-[11px] text-muted-foreground">
            No output yet
          </div>
        )}

        {outputUrl && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={async () => {
              const blob = data.assetKey ? await getAsset(data.assetKey) : null
              if (blob) saveToDisk(blob, buildFilename(effect.name, id, 'png'))
            }}
          >
            <Download /> Save to Downloads
          </Button>
        )}

        {data.error && (
          <div className="flex items-start gap-1.5 text-[11px] leading-snug text-red-400">
            <AlertCircle className="mt-px size-3 shrink-0" />
            <span>{data.error}</span>
          </div>
        )}
      </div>

      {/* Kept invisible so edges saved before inputs moved next to their field still resolve. */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      <Handle type="source" position={Position.Right} id="out" />
      <span className="pointer-events-none absolute top-1/2 -right-14 -translate-y-1/2 font-mono text-[10px] text-connector">
        Image
      </span>
    </NodeShell>
  )
}

/** Prefers the cached blob; falls back to fetching the remote URL. */
async function loadSource(assetKey?: string, url?: string): Promise<Blob | null> {
  if (assetKey) {
    const blob = await getAsset(assetKey)
    if (blob) return blob
  }
  if (!url) return null
  try {
    const res = await fetch(url)
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}

function ParamControl({
  param,
  value,
  onChange,
}: {
  param: EffectParam
  value: unknown
  onChange: (v: string | number | boolean) => void
}) {
  const current = value ?? param.default

  if (param.type === 'boolean') {
    return (
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={Boolean(current)}
          onChange={(e) => onChange(e.target.checked)}
          className="size-3.5 accent-[var(--accent-dim)]"
        />
        <span className="text-[12px]">{param.label}</span>
      </label>
    )
  }

  if (param.type === 'number') {
    return (
      <label className="block">
        <span className="mb-1 flex items-baseline justify-between text-[10px] tracking-wide text-muted-foreground uppercase">
          {param.label}
          <span className="font-mono normal-case">{String(current)}</span>
        </span>
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step ?? 1}
          value={Number(current)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 w-full accent-[var(--accent-dim)]"
        />
      </label>
    )
  }

  if (param.type === 'color') {
    return (
      <label className="flex items-center justify-between gap-2">
        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {param.label}
        </span>
        <input
          type="color"
          value={String(current)}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border border-border bg-card"
        />
      </label>
    )
  }

  return (
    <label className="block">
      <span className="mb-1 block text-[10px] tracking-wide text-muted-foreground uppercase">
        {param.label}
      </span>
      <select
        value={String(current)}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full rounded-md border border-border bg-card px-1.5 text-[12px] outline-none transition-colors duration-150 focus:border-border-active"
      >
        {param.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  )
}

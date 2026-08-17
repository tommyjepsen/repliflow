import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Image as ImageIcon, Link2, Loader2, Maximize2, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { NodeShell } from './NodeShell'
import { useStore, type AppNode } from '@/store'
import { cn } from '@/lib/utils'

type Props = NodeProps<Extract<AppNode, { type: 'image' }>>

/** A starting point: an image from disk, the clipboard, or a URL. */
export function ImageNode({ id, data, selected }: Props) {
  const updateNode = useStore((s) => s.updateNode)
  const setNodeImageFile = useStore((s) => s.setNodeImageFile)
  const openPreview = useStore((s) => s.openPreview)
  const localUrl = useStore((s) => (data.assetKey ? s.assetUrls[data.assetKey] : undefined))

  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showUrl, setShowUrl] = useState(false)

  const preview = localUrl ?? data.url

  const accept = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await setNodeImageFile(id, file)
      setShowUrl(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    updateNode(id, { assetKey: null, url: '', name: '' })
    setError('')
  }

  return (
    <NodeShell
      id={id}
      title="Image"
      subtitle={data.name || (data.url ? 'from URL' : 'source image')}
      selected={selected}
      icon={<ImageIcon className="size-3.5" />}
    >
      <div className="space-y-2.5">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0])
            // Allow re-picking the same file after a clear.
            e.target.value = ''
          }}
        />

        {preview ? (
          <div className="group relative overflow-hidden rounded-md border border-border bg-card">
            <img
              src={preview}
              alt=""
              onClick={() => openPreview({ url: preview, kind: 'image', title: data.name || data.url })}
              onError={() => setError('Could not load that image.')}
              className="w-full cursor-zoom-in"
            />
            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <button
                onClick={() =>
                  openPreview({ url: preview, kind: 'image', title: data.name || data.url })
                }
                title="View larger"
                className="flex size-6 items-center justify-center rounded bg-black/70 text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="size-3.5" />
              </button>
              <button
                onClick={clear}
                title="Remove"
                className="flex size-6 items-center justify-center rounded bg-black/70 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragging(false)
              accept(e.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed bg-card text-[11px] transition-colors duration-150',
              dragging
                ? 'border-border-active text-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Upload className="size-4" />
                Drop an image, or click to browse
              </>
            )}
          </button>
        )}

        {showUrl || (!preview && !busy) ? (
          <input
            value={data.url}
            onChange={(e) => {
              updateNode(id, { url: e.target.value.trim(), assetKey: null, name: '' })
              setError('')
            }}
            placeholder="…or paste an image URL"
            className="h-7 w-full rounded-md border border-border bg-card px-2 text-[12px] outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-border-active"
          />
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => input.current?.click()}
              className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-border text-[11px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
            >
              <Upload className="size-3" /> Replace
            </button>
            <button
              onClick={() => setShowUrl(true)}
              className="flex h-7 items-center justify-center gap-1.5 rounded-md border border-border px-2.5 text-[11px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
            >
              <Link2 className="size-3" /> URL
            </button>
          </div>
        )}

        {error && <p className="text-[11px] leading-snug text-red-400">{error}</p>}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
      <span className="pointer-events-none absolute top-1/2 -right-14 -translate-y-1/2 font-mono text-[10px] text-connector">
        Image
      </span>
    </NodeShell>
  )
}

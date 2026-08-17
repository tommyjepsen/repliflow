import {
  AudioLines,
  Box,
  Download,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  ImagePlus,
  Trash2,
  Video,
} from 'lucide-react'
import { useReactFlow } from '@xyflow/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import {
  chooseDownloadFolder,
  forgetDownloadFolder,
  getFolderStatus,
  reconnectDownloadFolder,
  type FolderStatus,
} from '@/lib/fs'
import type { OutputKind } from '@/lib/models'
import { getAsset, saveToDisk, type GalleryEntry } from '@/lib/projects'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

const KIND_ICONS: Record<OutputKind, typeof Video> = {
  image: ImageIcon,
  video: Video,
  audio: AudioLines,
  model3d: Box,
  text: FileText,
}

/** Every generation, newest first, rendered inside the left sheet. */
export function GalleryView() {
  const gallery = useStore((s) => s.gallery)
  const projectId = useStore((s) => s.projectId)
  const autoDownload = useStore((s) => s.autoDownload)
  const setAutoDownload = useStore((s) => s.setAutoDownload)
  const removeGalleryEntry = useStore((s) => s.removeGalleryEntry)
  const refreshGallery = useStore((s) => s.refreshGallery)

  const [scope, setScope] = useState<'all' | 'project'>('all')

  useEffect(() => {
    refreshGallery()
  }, [refreshGallery])

  const items = scope === 'all' ? gallery : gallery.filter((g) => g.projectId === projectId)

  return (
    <>
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Tab active={scope === 'all'} onClick={() => setScope('all')}>
          All projects
        </Tab>
        <Tab active={scope === 'project'} onClick={() => setScope('project')}>
          This project
        </Tab>
        <span className="ml-auto pr-1 font-mono text-[10px] text-muted-foreground">
          {items.length}
        </span>
      </div>

      <div className="space-y-1.5 border-b border-border px-3 py-2">
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            checked={autoDownload}
            onChange={(e) => setAutoDownload(e.target.checked)}
            className="size-3.5 accent-[var(--accent-dim)]"
          />
          Save every generation to disk
        </label>
        <DownloadFolderRow />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-[12px] text-muted-foreground">
            Nothing generated yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {items.map((entry) => (
              <GalleryItem key={entry.key} entry={entry} onDelete={removeGalleryEntry} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Lets the user nominate a folder so saved files land in `<folder>/repliflow/`.
 * Without one, browsers can only write to the default Downloads directory.
 */
function DownloadFolderRow() {
  const [status, setStatus] = useState<FolderStatus | null>(null)

  const refresh = () => getFolderStatus().then(setStatus)
  useEffect(() => {
    refresh()
  }, [])

  if (!status) return null

  if (status.state === 'unsupported') {
    return (
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <FolderOpen className="mt-px size-3 shrink-0" />
        This browser can only save to the default Downloads folder. Chrome or Edge can write to a
        folder you pick.
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <FolderOpen className="size-3 shrink-0" />
      {status.state === 'ready' ? (
        <>
          <span className="min-w-0 flex-1 truncate font-mono">
            {status.name}/repliflow/
          </span>
          <button
            onClick={async () => {
              await forgetDownloadFolder()
              refresh()
            }}
            className="shrink-0 underline underline-offset-2 hover:text-foreground"
          >
            Clear
          </button>
        </>
      ) : status.state === 'needs-permission' ? (
        <>
          <span className="min-w-0 flex-1 truncate">Reconnect {status.name}</span>
          <button
            onClick={async () => {
              await reconnectDownloadFolder()
              refresh()
            }}
            className="shrink-0 underline underline-offset-2 hover:text-foreground"
          >
            Allow
          </button>
        </>
      ) : (
        <>
          <span className="flex-1">Saving to default Downloads</span>
          <button
            onClick={async () => {
              try {
                await chooseDownloadFolder()
                refresh()
              } catch {
                // The picker was dismissed.
              }
            }}
            className="shrink-0 underline underline-offset-2 hover:text-foreground"
          >
            Choose folder
          </button>
        </>
      )}
    </div>
  )
}

function Tab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded px-2 py-1 text-[12px] transition-colors duration-150',
        active ? 'bg-panel-hover text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function GalleryItem({
  entry,
  onDelete,
}: {
  entry: GalleryEntry
  onDelete: (key: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const addImageNode = useStore((s) => s.addImageNode)
  const openPreview = useStore((s) => s.openPreview)

  // Object URLs are created per mounted tile and revoked when it unmounts.
  useEffect(() => {
    let objectUrl: string | null = null
    getAsset(entry.key).then((blob) => {
      if (!blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [entry.key])

  const Icon = KIND_ICONS[entry.kind]
  const zoomable = entry.kind === 'image' || entry.kind === 'video'

  const download = async () => {
    const blob = await getAsset(entry.key)
    if (blob) saveToDisk(blob, entry.filename)
  }

  /** Drops the cached file onto the canvas as a source image node. */
  const useAsInput = async () => {
    const blob = await getAsset(entry.key)
    if (!blob) return
    const file = new File([blob], entry.filename, { type: blob.type || 'image/png' })
    const at = screenToFlowPosition({
      x: window.innerWidth / 2 - 130,
      y: window.innerHeight / 2 - 140,
    })
    await addImageNode(at, file)
  }

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-card">
      <button
        onClick={() =>
          url &&
          zoomable &&
          openPreview({
            url,
            kind: entry.kind === 'video' ? 'video' : 'image',
            title: `${entry.modelName} · ${entry.filename}`,
          })
        }
        disabled={!url || !zoomable}
        className="flex aspect-square w-full items-center justify-center enabled:cursor-zoom-in"
      >
        {url && entry.kind === 'image' ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : url && entry.kind === 'video' ? (
          <video src={url} muted loop className="size-full object-cover" />
        ) : (
          <Icon className="size-5 text-muted-foreground" />
        )}
      </button>

      <div className="border-t border-border px-1.5 py-1">
        <div className="truncate text-[10px]">{entry.modelName}</div>
        <div className="truncate font-mono text-[9px] text-muted-foreground">
          {entry.projectTitle || 'untitled'}
        </div>
      </div>

      <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {entry.kind === 'image' && (
          <Tooltip label="Use as input on the canvas">
            <Button size="icon" variant="secondary" className="size-6" onClick={useAsInput}>
              <ImagePlus />
            </Button>
          </Tooltip>
        )}
        <Tooltip label={`Save ${entry.filename}`}>
          <Button size="icon" variant="secondary" className="size-6" onClick={download}>
            <Download />
          </Button>
        </Tooltip>
        <Tooltip label="Delete">
          <Button
            size="icon"
            variant="secondary"
            className="size-6 hover:text-red-400"
            onClick={() => onDelete(entry.key)}
          >
            <Trash2 />
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}

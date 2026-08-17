import { ExternalLink, X } from 'lucide-react'
import { useEffect } from 'react'
import { useStore } from '@/store'

/** Full-screen look at one image or video. Click anywhere, or Escape, to close. */
export function Lightbox() {
  const preview = useStore((s) => s.preview)
  const closePreview = useStore((s) => s.closePreview)

  useEffect(() => {
    if (!preview) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePreview()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [preview, closePreview])

  if (!preview) return null

  return (
    <div
      onClick={closePreview}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/85 p-8 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-[92vw] items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
          {preview.title}
        </span>
        <a
          href={preview.url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
          title="Open in a new tab"
        >
          <ExternalLink className="size-4" />
        </a>
        <button
          onClick={closePreview}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
          title="Close (Esc)"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* The media itself swallows clicks so only the backdrop closes. */}
      {preview.kind === 'video' ? (
        <video
          src={preview.url}
          controls
          autoPlay
          loop
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[92vw] rounded-base border border-border"
        />
      ) : (
        <img
          src={preview.url}
          alt=""
          onClick={(e) => e.stopPropagation()}
          className="max-h-[85vh] max-w-[92vw] rounded-base border border-border object-contain"
        />
      )}
    </div>
  )
}

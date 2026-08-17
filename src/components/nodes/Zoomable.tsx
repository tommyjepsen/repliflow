import { Maximize2 } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Media framing with an expand affordance. Images zoom on click; video keeps its
 * own controls, so only the corner button opens the lightbox.
 */
export function Zoomable({
  url,
  onZoom,
  children,
}: {
  url: string
  onZoom: (url: string) => void
  children: ReactNode
}) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-card">
      {children}
      <button
        onClick={() => onZoom(url)}
        title="View larger"
        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded bg-black/70 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-foreground"
      >
        <Maximize2 className="size-3.5" />
      </button>
    </div>
  )
}

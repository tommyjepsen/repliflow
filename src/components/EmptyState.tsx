import { Eraser, Film, Image as ImageIcon, Video, Wand2, Zap } from 'lucide-react'
import type { TemplateId } from '@/lib/templates'
import { TEMPLATES } from '@/lib/templates'

const ICONS: Record<TemplateId, typeof ImageIcon> = {
  'prompt-to-image': ImageIcon,
  'prompt-to-video': Video,
  'image-to-image': Wand2,
  'image-to-video': Film,
  'cheap-video-test': Zap,
  'image-to-transparent': Eraser,
}

/** Shown on a blank canvas: one-click starting points. */
export function EmptyState({ onPick }: { onPick: (id: TemplateId) => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-5">
      <p className="text-[13px] text-muted-foreground">
        Start from a template, drop an image onto the canvas, or right-click to add a node
      </p>

      <div className="pointer-events-auto flex max-w-[880px] flex-wrap justify-center gap-3">
        {TEMPLATES.map((template) => {
          const Icon = ICONS[template.id]
          return (
            <button
              key={template.id}
              onClick={() => onPick(template.id)}
              className="surface w-52 p-4 text-left transition-colors duration-150 hover:border-border-strong"
            >
              <Icon className="mb-3 size-5 text-accent" />
              <div className="text-[13px]">{template.name}</div>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {template.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

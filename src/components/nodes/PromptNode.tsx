import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ChevronDown, Sparkles, Type } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NodeShell } from './NodeShell'
import { PROMPT_GROUPS, presetsIn, type PromptPreset } from '@/lib/prompts'
import { cn } from '@/lib/utils'
import { useStore, type AppNode } from '@/store'

type Props = NodeProps<Extract<AppNode, { type: 'prompt' }>>

export function PromptNode({ id, data, selected }: Props) {
  const updateNode = useStore((s) => s.updateNode)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as HTMLElement)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Appending rather than replacing means picking a preset never eats work in
  // progress; an empty node just gets the preset on its own.
  const apply = (preset: PromptPreset) => {
    const current = data.text.trim()
    updateNode(id, { text: current ? `${current}\n\n${preset.text}` : preset.text })
    setOpen(false)
  }

  return (
    <NodeShell
      id={id}
      title="Prompt"
      selected={selected}
      resizable={{ minWidth: 260, minHeight: 220 }}
      icon={<Type className="size-3.5" />}
    >
      <div className="flex h-full flex-col gap-2">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-7 w-full items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] text-muted-foreground transition-colors duration-150 hover:border-border-strong hover:text-foreground"
          >
            <Sparkles className="size-3 shrink-0 text-accent" />
            <span className="flex-1 text-left">Start from a template</span>
            <ChevronDown
              className={cn('size-3.5 transition-transform duration-150', open && 'rotate-180')}
            />
          </button>

          {open && (
            <div className="surface nowheel scroll-thin absolute top-8 left-0 z-30 max-h-72 w-80 overflow-y-auto p-1">
              {PROMPT_GROUPS.map((group) => (
                <div key={group}>
                  <div className="px-2.5 pt-2 pb-1 text-[10px] tracking-wide text-muted-foreground uppercase">
                    {group}
                  </div>
                  {presetsIn(group).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => apply(preset)}
                      className="w-full rounded px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-panel-hover"
                    >
                      <div className="truncate text-[12px]">{preset.name}</div>
                      <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                        {preset.text}
                      </p>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fills whatever height the node has been dragged to. */}
        <textarea
          value={data.text}
          onChange={(e) => updateNode(id, { text: e.target.value })}
          placeholder="Describe what you want to generate…"
          className="nowheel scroll-thin min-h-0 w-full flex-1 resize-none rounded-md border border-border bg-card p-2.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground focus:border-border-active"
        />
      </div>

      <Handle type="source" position={Position.Right} id="prompt" />
      <span className="pointer-events-none absolute top-1/2 -right-16 -translate-y-1/2 font-mono text-[10px] text-connector">
        Prompt
      </span>
    </NodeShell>
  )
}

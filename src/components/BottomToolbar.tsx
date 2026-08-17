import { useReactFlow, useStore as useFlowStore } from '@xyflow/react'
import { Hand, Maximize, MousePointer2, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type Tool = 'select' | 'pan'

export function BottomToolbar({
  tool,
  onToolChange,
  onAdd,
}: {
  tool: Tool
  onToolChange: (t: Tool) => void
  onAdd: () => void
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const zoom = useFlowStore((s) => s.transform[2])

  return (
    <div className="surface absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 p-1.5">
      <ToolButton
        active={tool === 'select'}
        onClick={() => onToolChange('select')}
        label="Select — drag the canvas to pan, shift-drag to select"
      >
        <MousePointer2 className="size-[18px]" />
      </ToolButton>
      <ToolButton
        active={tool === 'pan'}
        onClick={() => onToolChange('pan')}
        label="Hand — pan only, nodes locked in place"
      >
        <Hand className="size-[18px]" />
      </ToolButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <ToolButton onClick={onAdd} label="Add node">
        <Plus className="size-[18px]" />
      </ToolButton>
      <ToolButton onClick={() => fitView({ duration: 200, padding: 0.3 })} label="Fit view">
        <Maximize className="size-[18px]" />
      </ToolButton>

      <div className="mx-1 h-6 w-px bg-border" />

      <button
        onClick={() => zoomOut({ duration: 120 })}
        className="size-8 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
      >
        −
      </button>
      <span className="w-12 text-center font-mono text-[12px] text-muted-foreground tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => zoomIn({ duration: 120 })}
        className="size-8 rounded-md text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
      >
        +
      </button>
    </div>
  )
}

function ToolButton({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <Tooltip label={label} side="top">
      <button
        onClick={onClick}
        className={cn(
          'flex size-9 items-center justify-center rounded-md transition-colors duration-150',
          active
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:bg-panel-hover hover:text-foreground',
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

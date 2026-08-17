import { NodeResizer } from '@xyflow/react'
import { Copy, Info, MoreHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

/** Shared chrome for every canvas node: header, menu, selection ring. */
export function NodeShell({
  id,
  icon,
  title,
  subtitle,
  badge,
  info,
  selected,
  width = 260,
  resizable,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  subtitle?: string
  /** Small muted label on the right of the header, e.g. the model's price. */
  badge?: ReactNode
  /** Details shown in a hover popover behind an ⓘ in the header. */
  info?: ReactNode
  selected?: boolean
  width?: number
  /**
   * Lets the user drag the node's edges. The node then fills whatever size React
   * Flow records on it, so its body stretches instead of hugging its content.
   */
  resizable?: { minWidth: number; minHeight: number }
  children: ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const removeNode = useStore((s) => s.removeNode)
  const duplicateNode = useStore((s) => s.duplicateNode)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as HTMLElement)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  return (
    <div
      style={resizable ? undefined : { width }}
      className={cn(
        'relative rounded-base border bg-panel transition-colors duration-150',
        selected ? 'border-border-active' : 'border-border',
        resizable && 'flex h-full w-full flex-col',
      )}
    >
      {resizable && (
        <NodeResizer
          isVisible={selected}
          minWidth={resizable.minWidth}
          minHeight={resizable.minHeight}
          // Matches the selected-node border, so a resizable node highlights
          // exactly like every other one.
          lineStyle={{ borderColor: 'var(--border-active)', borderWidth: 1 }}
          handleStyle={{
            width: 8,
            height: 8,
            borderRadius: 2,
            background: 'var(--grip)',
            borderColor: 'var(--grip)',
          }}
        />
      )}
      <div className="drag-handle flex shrink-0 cursor-grab items-center gap-2 border-b border-border px-3 py-2 active:cursor-grabbing">
        <span className="text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-tight">{title}</span>
          {subtitle && (
            <span className="block truncate font-mono text-[10px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </span>
        {badge && (
          <span className="shrink-0 font-mono text-[10px] whitespace-nowrap text-muted-foreground">
            {badge}
          </span>
        )}
        {info && <InfoPopover>{info}</InfoPopover>}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="nodrag flex size-5 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
          {menuOpen && (
            <div className="surface absolute top-6 right-0 z-20 w-36 p-1">
              <MenuItem
                onClick={() => {
                  duplicateNode(id)
                  setMenuOpen(false)
                }}
              >
                <Copy className="size-3.5" /> Duplicate
              </MenuItem>
              <MenuItem danger onClick={() => removeNode(id)}>
                <Trash2 className="size-3.5" /> Delete
              </MenuItem>
            </div>
          )}
        </div>
      </div>
      <div className={cn('nodrag p-3', resizable && 'min-h-0 flex-1')}>{children}</div>
    </div>
  )
}

/**
 * Header ⓘ that reveals run details on hover. Clicking pins it open, so a long
 * prediction id stays put long enough to be selected and copied.
 */
function InfoPopover({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pinned) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as HTMLElement)) setPinned(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [pinned])

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={() => setPinned((v) => !v)}
        className={cn(
          'nodrag flex size-5 items-center justify-center rounded transition-colors duration-150 hover:bg-panel-hover hover:text-foreground',
          pinned ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <Info className="size-3.5" />
      </button>
      {(hovered || pinned) && (
        <div className="surface nowheel scroll-thin absolute top-6 right-0 z-30 max-h-72 w-72 overflow-y-auto p-2.5">
          {children}
        </div>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-panel-hover',
        danger ? 'text-red-400' : 'text-foreground',
      )}
    >
      {children}
    </button>
  )
}

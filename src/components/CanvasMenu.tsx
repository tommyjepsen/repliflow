import {
  AudioLines,
  Box,
  ChevronRight,
  Image as ImageIcon,
  ImagePlus,
  Search,
  Type,
  Video,
  Wand2,
  Wrench,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EFFECTS, type EffectDef } from '@/lib/effects'
import {
  CATEGORIES,
  groupsFor,
  modelsIn,
  priceFor,
  searchModels,
  type Category,
  type ModelDef,
} from '@/lib/models'
import { cn } from '@/lib/utils'

export type MenuTarget = { screenX: number; screenY: number; flowX: number; flowY: number }

type Choice =
  | { kind: 'prompt' }
  | { kind: 'image' }
  | { kind: 'model'; modelId: string }
  | { kind: 'effect'; effectId: string }

/** Menu sections: the model categories, plus local effects. */
type Section = Category | 'Effects'

const MARGIN = 8
const FIRST_COLUMN = 240
/** Widest submenu chain: group column + model column + gaps. */
const SUBMENU_SPAN = 232 + 296
const SEARCH_HEADER = 44
const FIRST_COLUMN_HEIGHT = SEARCH_HEADER + 400

const SECTION_ICONS: Record<Section, typeof ImageIcon> = {
  Image: ImageIcon,
  Video: Video,
  Audio: AudioLines,
  '3D': Box,
  Utility: Wrench,
  Effects: Wand2,
}

const SECTIONS: Section[] = [...CATEGORIES, 'Effects']

/** Right-click menu for adding nodes, mirroring the reference three-column layout. */
export function CanvasMenu({
  target,
  onClose,
  onPick,
}: {
  target: MenuTarget
  onClose: () => void
  onPick: (choice: Choice, at: { x: number; y: number }) => void
}) {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState<Section | null>(null)
  const [group, setGroup] = useState<string | null>(null)
  /** Vertical offsets so each submenu opens level with the row that spawned it. */
  const [sectionTop, setSectionTop] = useState(0)
  const [groupTop, setGroupTop] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  /** Offset of a hovered row from the top of the menu, so columns can line up. */
  const rowOffset = (event: React.MouseEvent<HTMLElement>) => {
    const container = ref.current?.getBoundingClientRect()
    if (!container) return 0
    return event.currentTarget.getBoundingClientRect().top - container.top
  }

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as HTMLElement)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const pick = (choice: Choice) => {
    onPick(choice, { x: target.flowX, y: target.flowY })
    onClose()
  }

  const results = useMemo(() => (query.trim() ? searchModels(query) : null), [query])
  const effectResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return EFFECTS.filter((e) => `${e.name} ${e.description}`.toLowerCase().includes(q))
  }, [query])

  const isEffects = section === 'Effects'
  const groups = useMemo(
    () => (section && !isEffects ? groupsFor(section as Category) : []),
    [section, isEffects],
  )
  const groupModels = useMemo(
    () => (section && !isEffects && group ? modelsIn(section as Category, group) : []),
    [section, isEffects, group],
  )

  // The first column is anchored to the pointer; only the submenus need room to
  // one side, so they open leftward when there isn't space on the right.
  const flip = target.screenX + FIRST_COLUMN + SUBMENU_SPAN > window.innerWidth
  const anchor = flip
    ? { right: Math.max(MARGIN, window.innerWidth - target.screenX) }
    : { left: Math.min(target.screenX, window.innerWidth - FIRST_COLUMN - MARGIN) }

  const top = Math.max(
    MARGIN,
    Math.min(target.screenY, window.innerHeight - FIRST_COLUMN_HEIGHT - MARGIN),
  )

  /** Every column scrolls within whatever vertical space is left below it. */
  const columnStyle = (offset = 0) => ({
    marginTop: offset,
    maxHeight: Math.max(160, window.innerHeight - top - offset - MARGIN * 2),
  })

  return (
    <div
      ref={ref}
      className={cn('fixed z-50 flex items-start gap-1', flip && 'flex-row-reverse')}
      style={{ ...anchor, top }}
    >
      <div className="surface w-60 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div
          className="scroll-thin overflow-y-auto p-1"
          style={{ maxHeight: Math.max(160, window.innerHeight - top - SEARCH_HEADER - MARGIN * 2) }}
        >
          {results ? (
            results.length || effectResults?.length ? (
              <>
                {effectResults?.map((e) => (
                  <EffectRow
                    key={e.id}
                    effect={e}
                    onClick={() => pick({ kind: 'effect', effectId: e.id })}
                  />
                ))}
                {results.map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    onClick={() => pick({ kind: 'model', modelId: m.id })}
                  />
                ))}
              </>
            ) : (
              <div className="px-2.5 py-3 text-[13px] text-muted-foreground">Nothing found</div>
            )
          ) : (
            <>
              <Row
                onMouseEnter={() => {
                  setSection(null)
                  setGroup(null)
                }}
                onClick={() => pick({ kind: 'prompt' })}
                key="prompt"
              >
                <Type className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1">Prompt</span>
              </Row>
              <Row
                onMouseEnter={() => {
                  setSection(null)
                  setGroup(null)
                }}
                onClick={() => pick({ kind: 'image' })}
                key="image"
              >
                <ImagePlus className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1">Image (upload or URL)</span>
              </Row>
              <div className="my-1 h-px bg-border" />
              {SECTIONS.map((s) => {
                const Icon = SECTION_ICONS[s]
                return (
                  <Row
                    key={s}
                    active={section === s}
                    onMouseEnter={(e) => {
                      setSection(s)
                      setGroup(null)
                      setSectionTop(rowOffset(e))
                    }}
                    chevron
                  >
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{s === 'Effects' ? 'Effects' : `${s} models`}</span>
                  </Row>
                )
              })}
            </>
          )}
        </div>
      </div>

      {!results && isEffects && (
        <div
          className="surface scroll-thin w-64 overflow-y-auto p-1"
          style={columnStyle(sectionTop)}
        >
          {EFFECTS.map((e) => (
            <EffectRow
              key={e.id}
              effect={e}
              onClick={() => pick({ kind: 'effect', effectId: e.id })}
            />
          ))}
        </div>
      )}

      {!results && section && !isEffects && (
        <div
          className="surface scroll-thin w-56 overflow-y-auto p-1"
          style={columnStyle(sectionTop)}
        >
          {groups.map((g) => (
            <Row
              key={g}
              active={group === g}
              onMouseEnter={(e) => {
                setGroup(g)
                setGroupTop(rowOffset(e))
              }}
              chevron
            >
              <span className="flex-1">{g}</span>
            </Row>
          ))}
        </div>
      )}

      {!results && !isEffects && group && (
        <div
          className="surface scroll-thin w-72 overflow-y-auto p-1"
          style={columnStyle(groupTop)}
        >
          {groupModels.map((m) => (
            <ModelRow key={m.id} model={m} onClick={() => pick({ kind: 'model', modelId: m.id })} />
          ))}
        </div>
      )}
    </div>
  )
}

function Row({
  children,
  onClick,
  onMouseEnter,
  active,
  chevron,
}: {
  children: React.ReactNode
  onClick?: () => void
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void
  active?: boolean
  chevron?: boolean
}) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150',
        active ? 'bg-panel-hover' : 'hover:bg-panel-hover',
      )}
    >
      {children}
      {chevron && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
    </button>
  )
}

function EffectRow({ effect, onClick }: { effect: EffectDef; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-panel-hover"
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px]">{effect.name}</span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">free · local</span>
      </div>
      <div className="truncate text-[10px] text-muted-foreground">{effect.description}</div>
    </button>
  )
}

function ModelRow({ model, onClick }: { model: ModelDef; onClick: () => void }) {
  const price = priceFor(model.id)
  return (
    <button
      onClick={onClick}
      className="w-full rounded px-2.5 py-1.5 text-left transition-colors duration-150 hover:bg-panel-hover"
    >
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px]">{model.name}</span>
        {price && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{price}</span>
        )}
      </div>
      <div className="truncate font-mono text-[10px] text-muted-foreground">{model.id}</div>
    </button>
  )
}

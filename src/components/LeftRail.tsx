import {
  BarChart3,
  FolderInput,
  FolderOpen,
  Images,
  KeyRound,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react'
import type { PanelTab } from './SidePanel'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useStore, type ThemePref } from '@/store'

type RailAction = {
  icon: typeof Images
  label: string
  onClick: () => void
  active?: boolean
  /** Small dot on the icon: green when wired up, red when something is missing. */
  status?: 'ok' | 'missing'
}

/** Fixed icon rail on the left edge. */
export function LeftRail({
  panel,
  onTogglePanel,
  onOpenImport,
  onOpenKey,
}: {
  panel: PanelTab | null
  onTogglePanel: (tab: PanelTab) => void
  onOpenImport: () => void
  onOpenKey: () => void
}) {
  const apiKey = useStore((s) => s.apiKey)
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  return (
    // Floats over the canvas like the sheet and the toolbar, so the dot grid
    // runs behind it and the app reads as one surface.
    <aside className="surface absolute top-3 bottom-3 left-3 z-40 flex w-[52px] flex-col items-center gap-1 bg-rail py-3">
      {/* Same mark as the favicon, so it holds in either theme: dark dot, light square. */}
      <div className="mb-3 flex size-8 items-center justify-center rounded-md border border-border bg-white">
        <span className="size-2 rounded-full bg-[#111111]" />
      </div>

      <RailButton
        icon={FolderOpen}
        label="Projects, name & sharing"
        active={panel === 'projects'}
        onClick={() => onTogglePanel('projects')}
      />
      <RailButton
        icon={Images}
        label="Gallery"
        active={panel === 'gallery'}
        onClick={() => onTogglePanel('gallery')}
      />
      <RailButton
        icon={BarChart3}
        label="Account & usage"
        active={panel === 'usage'}
        onClick={() => onTogglePanel('usage')}
      />

      <div className="flex-1" />

      <RailButton
        icon={KeyRound}
        label={apiKey ? 'Replicate key connected — change it' : 'No Replicate API key — add one'}
        status={apiKey ? 'ok' : 'missing'}
        onClick={onOpenKey}
      />
      <RailButton
        icon={THEME_ICONS[theme]}
        label={THEME_LABELS[theme]}
        onClick={() => setTheme(nextTheme(theme))}
      />
      <RailButton icon={FolderInput} label="Import a shared canvas" onClick={onOpenImport} />
    </aside>
  )
}

/** Cycles OS → light → dark, so following the system stays reachable. */
const THEME_ORDER: ThemePref[] = ['system', 'light', 'dark']
const THEME_ICONS: Record<ThemePref, typeof Images> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
}
const THEME_LABELS: Record<ThemePref, string> = {
  system: 'Theme: follows your system — click for light',
  light: 'Theme: light — click for dark',
  dark: 'Theme: dark — click to follow your system',
}

function nextTheme(current: ThemePref) {
  return THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length]
}

function RailButton({ icon: Icon, label, onClick, active, status }: RailAction) {
  return (
    <Tooltip label={label} side="right">
      <button
        onClick={onClick}
        className={cn(
          'relative flex size-9 items-center justify-center rounded-md transition-colors duration-150',
          active
            ? 'bg-panel-hover text-foreground'
            : 'text-muted-foreground hover:bg-panel-hover hover:text-foreground',
          status === 'missing' && 'text-red-400 hover:text-red-300',
        )}
      >
        <Icon className="size-[18px]" />
        {status && (
          <span
            className={cn(
              // Ringed in the rail colour so it reads as a badge on the icon.
              'absolute right-1.5 bottom-1.5 size-1.5 rounded-full ring-2 ring-rail',
              status === 'ok' ? 'bg-emerald-400' : 'bg-red-500',
            )}
          />
        )}
      </button>
    </Tooltip>
  )
}

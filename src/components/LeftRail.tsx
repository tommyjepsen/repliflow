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

const REPO_URL = 'https://github.com/tommyjepsen/repliflow'

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

      <Tooltip label="Repliflow on GitHub" side="right">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
        >
          <GithubMark />
        </a>
      </Tooltip>
    </aside>
  )
}

/** Lucide dropped brand icons in v1, so the mark is inlined as a filled path. */
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-[18px] fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
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

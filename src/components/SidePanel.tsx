import { BarChart3, FolderOpen, Images, X } from 'lucide-react'
import { useEffect } from 'react'
import { GalleryView } from './GalleryView'
import { ProjectsView } from './ProjectsView'
import { UsageView } from './UsageView'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

export type PanelTab = 'projects' | 'gallery' | 'usage'

const TABS: { id: PanelTab; label: string; icon: typeof Images }[] = [
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'gallery', label: 'Gallery', icon: Images },
  { id: 'usage', label: 'Account', icon: BarChart3 },
]

/** Left sheet hosting the projects, gallery and account tabs. */
export function SidePanel({
  tab,
  onTabChange,
  onClose,
}: {
  tab: PanelTab | null
  onTabChange: (t: PanelTab) => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!tab) return
    // Escape belongs to the lightbox while it is open.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useStore.getState().preview) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tab, onClose])

  if (!tab) return null

  return (
    // Clears the floating rail: 12px inset + 52px wide + a 8px gap.
    <aside className="surface absolute top-3 bottom-3 left-[72px] z-40 flex w-[340px] flex-col overflow-hidden">
      <header className="flex items-center gap-1 border-b border-border px-2 py-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1 text-[12px] transition-colors duration-150',
              tab === id
                ? 'bg-panel-hover text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
        <Tooltip label="Close">
          <button
            onClick={onClose}
            className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-panel-hover hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </Tooltip>
      </header>

      {tab === 'projects' ? <ProjectsView /> : tab === 'gallery' ? <GalleryView /> : <UsageView />}
    </aside>
  )
}

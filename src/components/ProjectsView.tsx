import { Check, Copy, FileDown, Plus, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'

/** Project name, save state, sharing and the project list, inside the left sheet. */
export function ProjectsView() {
  const title = useStore((s) => s.title)
  const setTitle = useStore((s) => s.setTitle)
  const projects = useStore((s) => s.projects)
  const projectId = useStore((s) => s.projectId)
  const saving = useStore((s) => s.saving)
  const openProject = useStore((s) => s.openProject)
  const createProject = useStore((s) => s.createProject)
  const removeProject = useStore((s) => s.removeProject)
  const duplicateProject = useStore((s) => s.duplicateProject)
  const exportShare = useStore((s) => s.exportShare)
  const downloadProject = useStore((s) => s.downloadProject)

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  /** Project id that just landed on disk, or 'current' for the header button. */
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const download = async (id?: string) => {
    setError('')
    try {
      await downloadProject(id)
      setSaved(id ?? 'current')
      setTimeout(() => setSaved(null), 1600)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const copyShare = async () => {
    const code = exportShare()
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      // Clipboard access can be denied; fall back to a selectable prompt.
      window.prompt('Copy this share code:', code)
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <div className="space-y-2 border-b border-border p-3">
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between text-[10px] tracking-wide text-muted-foreground uppercase">
            Project name
            <span
              className={cn(
                'font-normal normal-case transition-opacity duration-300',
                saving ? 'opacity-100' : 'opacity-0',
              )}
            >
              saving…
            </span>
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-card px-2.5 text-[14px] outline-none transition-colors duration-150 focus:border-border-active"
          />
        </label>

        {/* New is the only action worth a word; the rest are icons off to the right. */}
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={createProject}>
            <Plus /> New
          </Button>

          <div className="ml-auto flex items-center gap-0.5">
            <IconAction label="Duplicate this project" icon={Copy} onClick={duplicateProject} />
            <IconAction
              label="Copy a share code for this canvas"
              icon={copied ? Check : Share2}
              done={copied}
              onClick={copyShare}
            />
            <IconAction
              label="Download this canvas as a .repliflow.json file"
              icon={saved === 'current' ? Check : FileDown}
              done={saved === 'current'}
              onClick={() => download()}
            />
          </div>
        </div>

        {error && <p className="text-[12px] text-red-400">{error}</p>}
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-1">
        {projects.map((project) => (
          <div
            key={project.id}
            className="group flex items-center gap-1 rounded transition-colors duration-150 hover:bg-panel-hover"
          >
            <button
              onClick={() => project.id !== projectId && openProject(project.id)}
              className="min-w-0 flex-1 px-2.5 py-1.5 text-left"
            >
              <div className="flex items-center gap-1.5">
                {project.id === projectId ? (
                  <Check className="size-3 shrink-0 text-accent" />
                ) : (
                  <span className="size-3 shrink-0" />
                )}
                <span className="truncate text-[13px]">{project.title || 'untitled'}</span>
              </div>
              <div className="pl-[18px] text-[11px] text-muted-foreground">
                {project.nodeCount} node{project.nodeCount === 1 ? '' : 's'} ·{' '}
                {relativeTime(project.updatedAt)}
              </div>
            </button>

            <Tooltip label="Download this project as a file" side="right">
              <button
                onClick={() => download(project.id)}
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-foreground',
                  // Keep the tick visible after the pointer moves away.
                  saved === project.id && 'opacity-100',
                )}
              >
                {saved === project.id ? (
                  <Check className="size-3.5 text-emerald-400" />
                ) : (
                  <FileDown className="size-3.5" />
                )}
              </button>
            </Tooltip>

            {confirmId === project.id ? (
              <button
                onClick={() => {
                  removeProject(project.id)
                  setConfirmId(null)
                }}
                className="mr-1.5 shrink-0 rounded px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10"
              >
                Delete?
              </button>
            ) : (
              <Tooltip label="Delete project" side="right">
                <button
                  onClick={() => setConfirmId(project.id)}
                  className="mr-1.5 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

/** Square ghost button whose meaning lives in its tooltip. */
function IconAction({
  label,
  icon: Icon,
  onClick,
  done,
}: {
  label: string
  icon: typeof Copy
  onClick: () => void
  done?: boolean
}) {
  return (
    <Tooltip label={label}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={cn('size-7 px-0', done && 'text-emerald-400 hover:text-emerald-400')}
      >
        <Icon />
      </Button>
    </Tooltip>
  )
}

function relativeTime(ts: number) {
  const seconds = Math.round((ts - Date.now()) / 1000)
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4.35],
    ['month', 12],
  ]

  let value = seconds
  for (const [unit, size] of units) {
    if (Math.abs(value) < size) return format.format(Math.round(value), unit)
    value /= size
  }
  return format.format(Math.round(value), 'year')
}

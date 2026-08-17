import { Download, FileUp, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store'

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const importShare = useStore((s) => s.importShare)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCode('')
      setError('')
      setWarning('')
    }
  }, [open])

  /** A downloaded `.repliflow.json` is just the graph, so it loads straight in. */
  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    try {
      setCode(await file.text())
    } catch {
      setError('That file could not be read')
    }
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    setWarning('')
    try {
      const result = await importShare(code)
      if (result.skipped.length) {
        // Keep the dialog open so the warning is actually read.
        setWarning(
          `Imported ${result.nodes} node${result.nodes === 1 ? '' : 's'} as “${result.title}”. Skipped ${result.skipped.length} unknown: ${result.skipped.join(', ')}`,
        )
      } else {
        onOpenChange(false)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <Download className="size-4 text-accent" />
          Import a canvas
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Paste a share code, or open a downloaded <code>.repliflow.json</code> file. It arrives
          as a new project, so nothing open is overwritten. Generated output is not included —
          only the nodes, prompts and settings.
        </DialogDescription>

        <textarea
          value={code}
          autoFocus
          onChange={(e) => {
            setCode(e.target.value)
            setError('')
          }}
          rows={5}
          placeholder="repliflow:v1:…"
          className="scroll-thin mt-4 w-full resize-none rounded-md border border-border bg-card p-2.5 font-mono text-[11px] leading-relaxed break-all outline-none placeholder:text-muted-foreground focus:border-border-active"
        />

        {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
        {warning && <p className="mt-2 text-[12px] text-amber-400">{warning}</p>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0])
              // Reset so picking the same file twice still fires a change.
              e.target.value = ''
            }}
          />
          <Button variant="ghost" className="mr-auto" onClick={() => fileInput.current?.click()}>
            <FileUp /> Open file…
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {warning ? 'Done' : 'Cancel'}
          </Button>
          <Button onClick={submit} disabled={busy || !code.trim()}>
            {busy && <Loader2 className="animate-spin" />}
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

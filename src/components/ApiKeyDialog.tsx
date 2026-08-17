import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { verifyToken } from '@/lib/replicate'
import { useStore } from '@/store'

export function ApiKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const apiKey = useStore((s) => s.apiKey)
  const setApiKey = useStore((s) => s.setApiKey)
  const [value, setValue] = useState(apiKey)
  const [state, setState] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setValue(apiKey)
      setState('idle')
      setError('')
    }
  }, [open, apiKey])

  const save = async () => {
    const token = value.trim()
    if (!token) {
      setApiKey('')
      onOpenChange(false)
      return
    }
    setState('checking')
    try {
      await verifyToken(token)
      setApiKey(token)
      setState('ok')
      setTimeout(() => onOpenChange(false), 500)
    } catch (err) {
      setState('error')
      setError((err as Error).message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-accent" />
          Replicate API key
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Create a token at{' '}
          <a
            href="https://replicate.com/account/api-tokens"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2"
          >
            replicate.com/account/api-tokens
          </a>
          . It is stored in this browser only and sent through the local dev proxy.
        </DialogDescription>

        <div className="mt-4 space-y-2">
          <Input
            type="password"
            value={value}
            autoFocus
            onChange={(e) => {
              setValue(e.target.value)
              setState('idle')
            }}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="r8_…"
            className="font-mono"
          />
          {state === 'error' && <p className="text-[12px] text-red-400">{error}</p>}
          {state === 'ok' && (
            <p className="flex items-center gap-1.5 text-[12px] text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Key verified
            </p>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={state === 'checking'}>
            {state === 'checking' && <Loader2 className="animate-spin" />}
            Save key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store'

const SEEN = 'replicater.keyPromptSeen'

/**
 * Shown once, over the canvas, when there is no API key — nothing can generate
 * without one, and a red dot in the rail is easy to miss on a first visit. It is
 * dismissible: exploring the canvas without a key is legitimate.
 */
export function ApiKeyGate({ onOpenKey }: { onOpenKey: () => void }) {
  const apiKey = useStore((s) => s.apiKey)
  const ready = useStore((s) => s.ready)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(SEEN) === 'yes')

  if (!ready || apiKey || dismissed) return null

  const dismiss = () => {
    localStorage.setItem(SEEN, 'yes')
    setDismissed(true)
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="surface w-[400px] p-5">
        <div className="mb-3 flex size-9 items-center justify-center rounded-md border border-border bg-card">
          <KeyRound className="size-4 text-accent" />
        </div>

        <h2 className="text-[15px]">Connect your Replicate key</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Every model on the canvas runs on Replicate, so nothing will generate until a key is set.
          It stays in this browser and is sent only through the local dev proxy.
        </p>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => {
              dismiss()
              onOpenKey()
            }}
            className="flex-1"
          >
            <KeyRound />
            Add API key
          </Button>
          <Button variant="ghost" onClick={dismiss}>
            Look around first
          </Button>
        </div>
      </div>
    </div>
  )
}

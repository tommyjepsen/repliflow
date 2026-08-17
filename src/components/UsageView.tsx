import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Loader2 } from 'lucide-react'
import { getAccount, listPredictions, type PredictionSummary } from '@/lib/replicate'
import { useStore } from '@/store'

/** Everything the API will tell us about the account, inside the left sheet. */
export function UsageView() {
  const apiKey = useStore((s) => s.apiKey)

  const account = useQuery({
    queryKey: ['account', apiKey],
    queryFn: () => getAccount(apiKey),
    enabled: Boolean(apiKey),
    staleTime: 5 * 60 * 1000,
  })

  const usage = useQuery({
    queryKey: ['predictions', apiKey],
    queryFn: () => listPredictions(apiKey),
    enabled: Boolean(apiKey),
    staleTime: 60 * 1000,
  })

  const stats = usage.data ? summarize(usage.data.predictions) : null

  return (
    <div className="scroll-thin flex-1 overflow-y-auto p-3">
      {!apiKey ? (
        <p className="text-[13px] text-muted-foreground">Add an API key first.</p>
      ) : (
        <div className="space-y-4">
            <section>
              <Label>Account</Label>
              {account.isLoading ? (
                <Pending />
              ) : account.error ? (
                <p className="text-[12px] text-red-400">{(account.error as Error).message}</p>
              ) : (
                <div className="flex items-baseline gap-2 text-[13px]">
                  <span>{account.data?.name || account.data?.username}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {account.data?.username} · {account.data?.type}
                  </span>
                </div>
              )}
            </section>

            <section>
              <Label>
                Usage
                {usage.data && (
                  <span className="ml-1.5 font-normal normal-case">
                    · last {usage.data.predictions.length} prediction
                    {usage.data.predictions.length === 1 ? '' : 's'}
                    {usage.data.complete ? '' : ' (capped)'}
                  </span>
                )}
              </Label>

              {usage.isLoading ? (
                <Pending />
              ) : usage.error ? (
                <p className="text-[12px] text-red-400">{(usage.error as Error).message}</p>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat label="Runs" value={String(stats.total)} />
                    <Stat label="Compute time" value={formatSeconds(stats.computeSeconds)} />
                    <Stat label="Succeeded" value={`${stats.succeeded} / ${stats.total}`} />
                    <Stat label="Failed" value={String(stats.failed)} />
                    <Stat label="Last 24 hours" value={String(stats.last24h)} />
                    <Stat label="Last 7 days" value={String(stats.last7d)} />
                  </div>

                  {stats.topModels.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
                        Most used models
                      </div>
                      {stats.topModels.map((m) => (
                        <div key={m.model} className="flex items-baseline gap-2 text-[12px]">
                          <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                            {m.model}
                          </span>
                          <span className="text-muted-foreground">{m.runs} runs</span>
                          <span className="w-16 text-right font-mono text-[11px] text-muted-foreground">
                            {formatSeconds(m.seconds)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </section>

            <section>
              <Label>Spend</Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Replicate's API exposes no billing, credit or cost data — predictions report
                compute time but no price, so spend cannot be shown here.
              </p>
              <a
                href="https://replicate.com/account/billing"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-accent underline underline-offset-2"
              >
                Open billing on Replicate <ExternalLink className="size-3" />
              </a>
          </section>
        </div>
      )}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </div>
  )
}

function Pending() {
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
      <Loader2 className="size-3 animate-spin" /> Loading…
    </p>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-[13px] tabular-nums">{value}</div>
    </div>
  )
}

function summarize(predictions: PredictionSummary[]) {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  let computeSeconds = 0
  let succeeded = 0
  let failed = 0
  let last24h = 0
  let last7d = 0

  const perModel = new Map<string, { runs: number; seconds: number }>()

  for (const p of predictions) {
    const seconds = p.metrics?.predict_time ?? 0
    computeSeconds += seconds
    if (p.status === 'succeeded') succeeded++
    if (p.status === 'failed') failed++

    const age = now - new Date(p.created_at).getTime()
    if (age <= day) last24h++
    if (age <= day * 7) last7d++

    const entry = perModel.get(p.model) ?? { runs: 0, seconds: 0 }
    entry.runs++
    entry.seconds += seconds
    perModel.set(p.model, entry)
  }

  const topModels = [...perModel.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 6)

  return { total: predictions.length, computeSeconds, succeeded, failed, last24h, last7d, topModels }
}

function formatSeconds(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Canvas } from '@/components/Canvas'
import { TooltipProvider } from '@/components/ui/tooltip'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <main className="relative h-full w-full overflow-hidden bg-background">
          <Canvas />
        </main>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

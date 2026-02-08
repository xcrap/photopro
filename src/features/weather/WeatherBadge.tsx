import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ScoredConditions } from '@/lib/weather/scoring'

interface WeatherBadgeProps {
  score: ScoredConditions | null
  className?: string
}

const BREAKDOWN_LABELS: Record<string, string> = {
  windScore: 'Wind',
  highCloudScore: 'High clouds',
  blockingCloudScore: 'Low/mid clear',
  clearSkyScore: 'Clear sky',
  humidityScore: 'Humidity',
  moonScore: 'Moon darkness',
}

function getBadgeClass(score: number): string {
  if (score >= 85) return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200'
  if (score >= 70) return 'border-sky-300/20 bg-sky-300/10 text-sky-200'
  if (score >= 50) return 'border-amber-300/20 bg-amber-300/10 text-amber-200'
  return 'border-zinc-300/15 bg-zinc-300/8 text-zinc-300'
}

export function WeatherBadge({ score, className }: WeatherBadgeProps) {
  if (!score) return null

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold tabular-nums',
              getBadgeClass(score.score),
              className,
            )}
          >
            <span>{score.icon}</span>
            <span>{score.score}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="max-w-64 space-y-1.5 p-2.5">
          <p className="text-xs font-semibold">{score.label} conditions</p>
          <p className="text-[11px] opacity-80">{score.summary}</p>
          <div className="space-y-0.5 pt-0.5 text-[11px] opacity-85">
            {Object.entries(score.breakdown)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => (
                <p key={key}>
                  {BREAKDOWN_LABELS[key] ?? key}: {Math.round(value as number)}
                </p>
              ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

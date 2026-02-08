import { useMemo } from 'react'
import { Orbit, Eye, Clock, Compass } from 'lucide-react'
import { WeatherBadge } from '@/features/weather/WeatherBadge'
import { useLocationStore } from '@/stores/location-store'
import { useWeatherStore } from '@/stores/weather-store'
import { getComets, getMagnitudeRating } from '@/lib/astronomy/comet-calculator'
import { formatDate } from '@/lib/formatting'

export function NightCometsTab() {
  const { latitude } = useLocationStore()
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)

  const comets = useMemo(() => getComets(latitude), [latitude])

  if (comets.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
            <Orbit className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Comets</span>
        </div>

        <div className="surface space-y-2 py-10 text-center">
          <Orbit className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No notable comets currently visible
          </p>
          <p className="text-xs text-muted-foreground">
            Major comets are rare (a few per decade).
            <br />
            Check back when one is discovered!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10">
          <Orbit className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Comets</span>
      </div>

      {comets.map((comet) => {
        const weatherScore = getScoreForTime(comet.peakDateParsed, 'night')

        return (
          <div
            key={comet.id}
            className="surface-comet space-y-3 border-cyan-400/10 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {comet.isActive ? (
                    <span className="text-cyan-400">
                      Visible now
                    </span>
                  ) : (
                    formatDate(comet.peakDateParsed)
                  )}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {comet.name}
                </p>
              </div>
              <span className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                Mag {comet.magnitude}
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              {comet.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                <Eye className="h-3 w-3" />
                {getMagnitudeRating(comet.magnitude)}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                <Clock className="h-3 w-3" />
                {comet.bestViewingTime}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                <Compass className="h-3 w-3" />
                Look {comet.direction}
              </span>
            </div>

            {weatherScore && (
              <div className="pt-1">
                <WeatherBadge score={weatherScore} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

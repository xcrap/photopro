import { useMemo } from 'react'
import { Sparkles, Eye, Star } from 'lucide-react'
import { WeatherBadge } from '@/features/weather/WeatherBadge'
import { useLocationStore } from '@/stores/location-store'
import { useWeatherStore } from '@/stores/weather-store'
import {
  getUpcomingMeteorShowers,
  getZhrRating,
} from '@/lib/astronomy/meteor-calculator'
import { getVisibilityLabel } from '@/lib/astronomy/visibility'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { formatDate } from '@/lib/formatting'

export function NightMeteorsTab() {
  const { latitude, longitude } = useLocationStore()
  const getScoreForTime = useWeatherStore((state) => state.getScoreForTime)

  const showers = useMemo(
    () => getUpcomingMeteorShowers(new Date(), 12, latitude),
    [latitude],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-400/10">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Upcoming Meteor Showers
        </span>
      </div>

      {showers.length === 0 ? (
        <div className="surface py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No visible meteor showers in the next 12 months
          </p>
        </div>
      ) : (
        showers.map((shower) => {
          const peakNight = new Date(shower.peakDate)
          peakNight.setHours(2, 0, 0, 0)
          const moonData = getMoonData(peakNight, latitude, longitude)

          const weatherScore = getScoreForTime(
            peakNight,
            'night',
            moonData.illumination,
          )

          const stars = getZhrRating(shower.zhr)

          return (
            <div key={shower.id} className="surface space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    {formatDate(shower.peakDate)}
                    {shower.isActive && (
                      <span className="ml-2 text-xs font-medium text-emerald-400">
                        Active now
                      </span>
                    )}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-foreground/80">
                    {shower.name}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                  {Array.from({ length: 3 - stars }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-white/10 text-white/10" />
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {shower.description}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                  ZHR: {shower.zhr}/hour
                </span>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                  {'\uD83C\uDF16'} {moonData.illumination.toFixed(0)}% moon
                </span>
                <span className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                  <Eye className="h-3 w-3" />
                  {getVisibilityLabel(shower.visibility)}
                </span>
              </div>

              {weatherScore && (
                <div className="pt-1">
                  <WeatherBadge score={weatherScore} />
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

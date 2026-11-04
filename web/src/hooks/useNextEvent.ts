import { useEffect, useMemo, useState } from 'react'
import { useLocationStore } from '@/stores/location-store'
import { useTimeZone } from '@/hooks/useTimeZone'
import { getSunTimes } from '@/lib/astronomy/sun-calculator'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { formatCountdown, getNextEvent } from '@/lib/astronomy/countdown'
import { addLocalDays } from '@/lib/time/zone'

export function useNextEvent() {
  const latitude = useLocationStore((s) => s.latitude)
  const longitude = useLocationStore((s) => s.longitude)
  const timeZone = useTimeZone()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const nextEvent = useMemo(() => {
    const today = getNextEvent(
      now,
      getSunTimes(now, latitude, longitude, timeZone),
      getMoonData(now, latitude, longitude, timeZone),
      latitude,
    )
    if (today) return today

    const tomorrow = addLocalDays(now, 1, timeZone)
    return getNextEvent(
      now,
      getSunTimes(tomorrow, latitude, longitude, timeZone),
      getMoonData(tomorrow, latitude, longitude, timeZone),
      latitude,
    )
  }, [now, latitude, longitude, timeZone])

  const countdown = nextEvent ? formatCountdown(nextEvent.secondsUntil) : null

  return { nextEvent, countdown }
}

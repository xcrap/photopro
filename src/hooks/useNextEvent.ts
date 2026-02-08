import { useEffect, useMemo, useState } from 'react'
import { addDays } from 'date-fns'
import { useLocationStore } from '@/stores/location-store'
import { getSunTimes } from '@/lib/astronomy/sun-calculator'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { formatCountdown, getNextEvent } from '@/lib/astronomy/countdown'

export function useNextEvent() {
  const { latitude, longitude } = useLocationStore()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const sunTimesToday = useMemo(
    () => getSunTimes(now, latitude, longitude),
    [now, latitude, longitude],
  )
  const moonDataToday = useMemo(
    () => getMoonData(now, latitude, longitude),
    [now, latitude, longitude],
  )

  const tomorrow = useMemo(() => addDays(now, 1), [now])
  const sunTimesTomorrow = useMemo(
    () => getSunTimes(tomorrow, latitude, longitude),
    [tomorrow, latitude, longitude],
  )
  const moonDataTomorrow = useMemo(
    () => getMoonData(tomorrow, latitude, longitude),
    [tomorrow, latitude, longitude],
  )

  const nextEvent = useMemo(() => {
    const todayEvent = getNextEvent(now, sunTimesToday, moonDataToday)
    if (todayEvent) return todayEvent
    return getNextEvent(now, sunTimesTomorrow, moonDataTomorrow)
  }, [now, moonDataToday, moonDataTomorrow, sunTimesToday, sunTimesTomorrow])

  const countdown = nextEvent ? formatCountdown(nextEvent.secondsUntil) : null

  return { nextEvent, countdown }
}

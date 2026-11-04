import { useState, useMemo, useCallback } from 'react'
import { TZDate } from '@date-fns/tz'
import { differenceInCalendarDays } from 'date-fns'
import { useCurrentTime } from './useCurrentTime'
import { useTimeZone } from './useTimeZone'
import { addLocalDays, localDayKey } from '@/lib/time/zone'

/**
 * Selected day in the location's time zone.
 * - `selectedDate`: the current instant (today) or the same local wall time on another day.
 * - `selectedDayStart`: local midnight of the selected day. It only changes when the day
 *   changes, so use it for heavy scans (full moons, opportunities) instead of `selectedDate`.
 */
export function useSelectedDate() {
  const now = useCurrentTime()
  const timeZone = useTimeZone()
  const [dayOffset, setDayOffset] = useState(0)

  const selectedDate = useMemo(
    () => (dayOffset === 0 ? now : addLocalDays(now, dayOffset, timeZone)),
    [now, dayOffset, timeZone],
  )

  const dayKey = localDayKey(selectedDate, timeZone)
  const selectedDayStart = useMemo(() => {
    const [year, month, day] = dayKey.split('-').map(Number)
    return new Date(new TZDate(year, month - 1, day, timeZone).getTime())
  }, [dayKey, timeZone])

  const isCurrentDay = dayOffset === 0

  const goToPreviousDay = useCallback(() => setDayOffset((d) => d - 1), [])
  const goToNextDay = useCallback(() => setDayOffset((d) => d + 1), [])
  const goToToday = useCallback(() => setDayOffset(0), [])
  /** `date` comes from the date picker: a device-local midnight for the chosen Y/M/D. */
  const goToDate = useCallback(
    (date: Date) => {
      const today = new TZDate(Date.now(), timeZone)
      const todayAsDeviceDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      setDayOffset(differenceInCalendarDays(date, todayAsDeviceDay))
    },
    [timeZone],
  )

  return {
    selectedDate,
    selectedDayStart,
    timeZone,
    isToday: isCurrentDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
  }
}

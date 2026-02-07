import { useState, useMemo, useCallback } from 'react'
import { addDays, startOfDay, differenceInCalendarDays } from 'date-fns'
import { useCurrentTime } from './useCurrentTime'

export function useSelectedDate() {
  const now = useCurrentTime()
  const [dayOffset, setDayOffset] = useState(0)

  const selectedDate = useMemo(() => {
    if (dayOffset === 0) return now
    const base = startOfDay(now)
    const offsetDate = addDays(base, dayOffset)
    // Preserve current time of day for the offset date
    offsetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
    return offsetDate
  }, [now, dayOffset])

  const isCurrentDay = dayOffset === 0

  const goToPreviousDay = useCallback(() => setDayOffset((d) => d - 1), [])
  const goToNextDay = useCallback(() => setDayOffset((d) => d + 1), [])
  const goToToday = useCallback(() => setDayOffset(0), [])
  const goToDate = useCallback((date: Date) => {
    const diff = differenceInCalendarDays(date, startOfDay(new Date()))
    setDayOffset(diff)
  }, [])

  return {
    selectedDate,
    isToday: isCurrentDay,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
  }
}

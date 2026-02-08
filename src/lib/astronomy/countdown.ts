import { differenceInSeconds } from 'date-fns'
import type { MoonData, SunTimes } from '@/types'

export interface NextEvent {
  type: 'golden-hour-am' | 'golden-hour-pm' | 'blue-hour-am' | 'blue-hour-pm' | 'sunrise' | 'sunset' | 'moonrise' | 'moonset'
  label: string
  time: Date
  secondsUntil: number
}

const EVENT_LABELS: Record<NextEvent['type'], string> = {
  'golden-hour-am': 'Morning golden hour',
  'golden-hour-pm': 'Golden hour',
  'blue-hour-am': 'Morning blue hour',
  'blue-hour-pm': 'Blue hour',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  moonrise: 'Moonrise',
  moonset: 'Moonset',
}

export function getNextEvent(
  now: Date,
  sunTimes: SunTimes,
  moonData: MoonData,
): NextEvent | null {
  const candidates: Array<{ type: NextEvent['type']; time: Date }> = [
    { type: 'blue-hour-am', time: sunTimes.blueHourMorningStart },
    { type: 'sunrise', time: sunTimes.sunrise },
    { type: 'golden-hour-am', time: sunTimes.goldenHourMorningStart },
    { type: 'golden-hour-pm', time: sunTimes.goldenHourStart },
    { type: 'sunset', time: sunTimes.sunset },
    { type: 'blue-hour-pm', time: sunTimes.blueHourEveningStart },
  ]

  if (moonData.moonrise) {
    candidates.push({ type: 'moonrise', time: moonData.moonrise })
  }
  if (moonData.moonset) {
    candidates.push({ type: 'moonset', time: moonData.moonset })
  }

  const future = candidates
    .filter((candidate) => candidate.time.getTime() > now.getTime())
    .sort((a, b) => a.time.getTime() - b.time.getTime())

  if (future.length === 0) return null

  const next = future[0]
  return {
    type: next.type,
    label: EVENT_LABELS[next.type],
    time: next.time,
    secondsUntil: differenceInSeconds(next.time, now),
  }
}

export function formatCountdown(secondsUntil: number): string {
  if (secondsUntil <= 0) return 'Now'

  const hours = Math.floor(secondsUntil / 3600)
  const minutes = Math.floor((secondsUntil % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  return '<1m'
}

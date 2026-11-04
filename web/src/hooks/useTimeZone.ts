import { useLocationStore } from '@/stores/location-store'
import { getDeviceTimeZone, isValidTimeZone, timeZoneAt } from '@/lib/time/zone'

/** The current location's IANA time zone: stored, else offline lookup, else the device's. */
export function useTimeZone(): string {
  const timeZone = useLocationStore((state) => state.timeZone)
  const latitude = useLocationStore((state) => state.latitude)
  const longitude = useLocationStore((state) => state.longitude)
  if (isValidTimeZone(timeZone)) return timeZone
  return timeZoneAt(latitude, longitude) ?? getDeviceTimeZone()
}

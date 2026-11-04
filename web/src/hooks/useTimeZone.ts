import { useLocationStore } from '@/stores/location-store'
import { getDeviceTimeZone, isValidTimeZone } from '@/lib/time/zone'

/** The current location's IANA time zone, falling back to the device's. */
export function useTimeZone(): string {
  const timeZone = useLocationStore((state) => state.timeZone)
  return isValidTimeZone(timeZone) ? timeZone : getDeviceTimeZone()
}

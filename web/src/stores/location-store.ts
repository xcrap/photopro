import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavedLocation } from '@/types'
import { getLocationKey } from '@/lib/weather/cache'

export type GpsStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

const DEFAULT_LATITUDE = 40.7128
const DEFAULT_LONGITUDE = -74.006
const DEFAULT_NAME = 'New York, NY'

interface LocationState {
  latitude: number
  longitude: number
  name: string | null
  /** IANA zone of the current location; null until the first forecast reports it. */
  timeZone: string | null
  gpsEnabled: boolean
  gpsStatus: GpsStatus
  savedLocations: SavedLocation[]
}

interface LocationActions {
  setLocation: (lat: number, lon: number, name?: string | null, timeZone?: string | null) => void
  /** Record the time zone reported for (lat, lon) if it is the current or a saved location. */
  learnTimeZone: (lat: number, lon: number, timeZone: string) => void
  setGpsEnabled: (enabled: boolean) => void
  setGpsStatus: (status: GpsStatus) => void
  resetToDefault: () => void
  addSavedLocation: (location: Omit<SavedLocation, 'id'>) => void
  updateSavedLocation: (id: string, location: Omit<SavedLocation, 'id'>) => void
  removeSavedLocation: (id: string) => void
}

type LocationStore = LocationState & LocationActions

const initialState: LocationState = {
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
  name: DEFAULT_NAME,
  timeZone: 'America/New_York',
  gpsEnabled: true,
  gpsStatus: 'idle',
  savedLocations: [],
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      ...initialState,

      setLocation: (lat, lon, name, timeZone) =>
        set((state) => {
          const sameLocation = getLocationKey(lat, lon) === getLocationKey(state.latitude, state.longitude)
          return {
            latitude: lat,
            longitude: lon,
            name: name ?? null,
            timeZone: timeZone ?? (sameLocation ? state.timeZone : null),
          }
        }),

      learnTimeZone: (lat, lon, timeZone) =>
        set((state) => {
          const key = getLocationKey(lat, lon)
          const isCurrent = key === getLocationKey(state.latitude, state.longitude)
          return {
            timeZone: isCurrent ? timeZone : state.timeZone,
            savedLocations: state.savedLocations.map((loc) =>
              getLocationKey(loc.latitude, loc.longitude) === key ? { ...loc, timeZone } : loc,
            ),
          }
        }),

      setGpsEnabled: (enabled) =>
        set({ gpsEnabled: enabled }),

      setGpsStatus: (status) =>
        set({ gpsStatus: status }),

      resetToDefault: () =>
        set({ ...initialState }),

      addSavedLocation: (location) =>
        set((state) => ({
          savedLocations: [
            ...state.savedLocations,
            { ...location, id: crypto.randomUUID() },
          ],
        })),

      updateSavedLocation: (id, location) =>
        set((state) => ({
          savedLocations: state.savedLocations.map((loc) => {
            if (loc.id !== id) return loc
            const moved = getLocationKey(loc.latitude, loc.longitude) !== getLocationKey(location.latitude, location.longitude)
            return { ...location, id, timeZone: moved ? null : loc.timeZone ?? null }
          }),
        })),

      removeSavedLocation: (id) =>
        set((state) => ({
          savedLocations: state.savedLocations.filter((loc) => loc.id !== id),
        })),
    }),
    {
      name: 'photopro-location',
      // GPS status is runtime state; persisting "granted" made the header claim GPS on reload.
      partialize: (state) => ({
        latitude: state.latitude,
        longitude: state.longitude,
        name: state.name,
        timeZone: state.timeZone,
        gpsEnabled: state.gpsEnabled,
        savedLocations: state.savedLocations,
      }),
    },
  ),
)

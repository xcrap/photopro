import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SavedLocation } from '@/types'

export type GpsStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

const DEFAULT_LATITUDE = 40.7128
const DEFAULT_LONGITUDE = -73.906
const DEFAULT_NAME = 'New York, NY'

interface LocationState {
  latitude: number
  longitude: number
  name: string | null
  gpsEnabled: boolean
  gpsStatus: GpsStatus
  savedLocations: SavedLocation[]
}

interface LocationActions {
  setLocation: (lat: number, lon: number, name?: string | null) => void
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
  gpsEnabled: true,
  gpsStatus: 'idle',
  savedLocations: [],
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      ...initialState,

      setLocation: (lat, lon, name) =>
        set({
          latitude: lat,
          longitude: lon,
          name: name ?? null,
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
          savedLocations: state.savedLocations.map((loc) =>
            loc.id === id ? { ...location, id } : loc,
          ),
        })),

      removeSavedLocation: (id) =>
        set((state) => ({
          savedLocations: state.savedLocations.filter((loc) => loc.id !== id),
        })),
    }),
    {
      name: 'photopro-location',
    },
  ),
)

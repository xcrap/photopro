import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TimeFormat } from '@/types'

interface SettingsState {
  timeFormat: TimeFormat
  eclipseYearsRange: number
}

interface SettingsActions {
  setTimeFormat: (format: TimeFormat) => void
  setEclipseYearsRange: (years: number) => void
}

type SettingsStore = SettingsState & SettingsActions

const initialState: SettingsState = {
  timeFormat: '24h',
  eclipseYearsRange: 2,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setTimeFormat: (format) =>
        set({ timeFormat: format }),

      setEclipseYearsRange: (years) =>
        set({ eclipseYearsRange: Math.min(5, Math.max(1, years)) }),
    }),
    {
      name: 'photopro-settings',
    },
  ),
)

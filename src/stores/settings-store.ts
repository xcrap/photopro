import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeMode, TimeFormat } from '@/types'

interface SettingsState {
  timeFormat: TimeFormat
  theme: ThemeMode
  eclipseYearsRange: number
}

interface SettingsActions {
  setTimeFormat: (format: TimeFormat) => void
  setTheme: (theme: ThemeMode) => void
  setEclipseYearsRange: (years: number) => void
}

type SettingsStore = SettingsState & SettingsActions

const initialState: SettingsState = {
  timeFormat: '24h',
  theme: 'dark',
  eclipseYearsRange: 2,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...initialState,

      setTimeFormat: (format) =>
        set({ timeFormat: format }),

      setTheme: (theme) =>
        set({ theme }),

      setEclipseYearsRange: (years) =>
        set({ eclipseYearsRange: Math.min(5, Math.max(1, years)) }),
    }),
    {
      name: 'photopro-settings',
    },
  ),
)

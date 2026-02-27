export interface Location {
  latitude: number
  longitude: number
  name?: string
}

export interface SunTimes {
  sunrise: Date
  sunset: Date
  solarNoon: Date
  goldenHourStart: Date
  goldenHourEnd: Date
  goldenHourMorningStart: Date
  goldenHourMorningEnd: Date
  blueHourMorningStart: Date
  blueHourMorningEnd: Date
  blueHourEveningStart: Date
  blueHourEveningEnd: Date
  dawn: Date
  dusk: Date
  nauticalDawn: Date
  nauticalDusk: Date
  nightStart: Date
  nightEnd: Date
}

export interface SunPosition {
  altitude: number
  azimuth: number
}

export interface MoonData {
  phase: number
  phaseName: string
  illumination: number
  age: number
  distance: number
  emoji: string
  altitude: number
  azimuth: number
  tiltAngle: number
  moonrise: Date | null
  moonset: Date | null
}

export interface FullMoonEvent {
  date: Date
  name: string
  folkName: string
  isSupermoon: boolean
  distance?: number
}

export interface ProximityEvent {
  date: Date
  type: 'moonrise-sunrise' | 'moonrise-sunset' | 'moonset-sunrise' | 'moonset-sunset'
  timeDiffMinutes: number
  azimuthDiff: number
  moonIllumination: number
  description: string
  moonTime: Date
  sunTime: Date
}

export interface EclipseEvent {
  date: Date
  type: 'total' | 'partial' | 'annular' | 'penumbral'
  category: 'solar' | 'lunar'
  duration: string
  magnitude: number
  visibility: EclipseVisibility[]
  description: string
  peakTime: string
}

export interface EclipseVisibility {
  region: string
  bounds: {
    latMin: number
    latMax: number
    lonMin: number
    lonMax: number
  }
  percentage: number
}

export interface SpecialEvent {
  date: Date
  type: 'supermoon' | 'blue-moon' | 'micro-moon' | 'black-moon'
  name: string
  description: string
}

export interface SavedLocation {
  id: string
  name: string
  latitude: number
  longitude: number
}

export interface CityPreset {
  name: string
  latitude: number
  longitude: number
  country: string
}

export type TimeFormat = '12h' | '24h'

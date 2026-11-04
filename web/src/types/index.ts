export interface Location {
  latitude: number
  longitude: number
  name?: string
}

/** Polar day/night condition for a sun-times day, or null for a normal day. */
export type PolarCondition = 'midnight-sun' | 'polar-night' | null

/** Sun event times for one local day. `null` = the Sun never reaches that altitude (polar). */
export interface SunTimes {
  sunrise: Date | null
  sunset: Date | null
  solarNoon: Date | null
  polar: PolarCondition
  goldenHourStart: Date | null
  goldenHourEnd: Date | null
  goldenHourMorningStart: Date | null
  goldenHourMorningEnd: Date | null
  blueHourMorningStart: Date | null
  blueHourMorningEnd: Date | null
  blueHourEveningStart: Date | null
  blueHourEveningEnd: Date | null
  dawn: Date | null
  dusk: Date | null
  nauticalDawn: Date | null
  nauticalDusk: Date | null
  nightStart: Date | null
  nightEnd: Date | null
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
  distance: number
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
  /** IANA time zone, learned from the first forecast for this location. */
  timeZone?: string | null
}

export interface CityPreset {
  name: string
  latitude: number
  longitude: number
  country: string
}

export type TimeFormat = '12h' | '24h'

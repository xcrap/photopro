// Shared by the page and the horizon worker; keep this free of imports.
// See ALGORITHM.md → "Terrain Horizon (Real First/Last Light)".
export const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

export interface HorizonJob {
  id: number
  lat: number
  lng: number
}

export interface HorizonResult {
  id: number
  lat: number
  lng: number
  /** Ground elevation at the point (m). */
  elevation: number
  /** Apparent skyline altitude (degrees) for every half degree of azimuth from north. */
  angles: Float32Array
  /** Distance in metres to the point that forms the skyline. */
  distances: Float32Array
  /** 1 where the skyline is the open sea rather than land. */
  sea: Uint8Array
}

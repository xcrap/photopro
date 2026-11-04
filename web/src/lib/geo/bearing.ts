// Great-circle helpers for drawing direction rays on the map (ported from Waka Sun).
const EARTH_RADIUS_M = 6371008.8
const RAD = Math.PI / 180

/** Point at a distance along a great circle from (lat, lng), as [lng, lat]. */
export function destination(lat: number, lng: number, bearing: number, meters: number): [number, number] {
  const d = meters / EARTH_RADIUS_M
  const b = bearing * RAD
  const lat1 = lat * RAD
  const lng1 = lng * RAD
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(b))
  const lng2 =
    lng1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return [((lng2 / RAD + 540) % 360) - 180, lat2 / RAD]
}

/** A ray from (lat, lng) toward `bearing`, as a polyline of [lng, lat] points. */
export function bearingLine(lat: number, lng: number, bearing: number, meters: number, steps = 24): [number, number][] {
  const line: [number, number][] = [[lng, lat]]
  for (let i = 1; i <= steps; i++) line.push(destination(lat, lng, bearing, (meters * i) / steps))
  return line
}

/** Ground metres per CSS pixel in MapLibre's 512-pixel tiles. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (40075016.686 * Math.cos(lat * RAD)) / (512 * 2 ** zoom)
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
export function compass(azimuth: number): string {
  return COMPASS[Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16]
}

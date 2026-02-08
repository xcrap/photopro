/**
 * Calculate Julian Date from a JavaScript Date
 */
export function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5
}

/**
 * Calculate solar longitude for a given date.
 * Returns degrees (0-360).
 */
export function getSolarLongitude(date: Date): number {
  const JD = getJulianDate(date)
  const T = (JD - 2451545.0) / 36525

  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T

  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  const Mrad = (M * Math.PI) / 180

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.00029 * Math.sin(3 * Mrad)

  let longitude = L0 + C

  longitude = longitude % 360
  if (longitude < 0) longitude += 360

  return longitude
}

/**
 * Find the date when the Sun reaches a target solar longitude in a given year.
 */
export function findDateForSolarLongitude(
  targetLongitude: number,
  year: number,
): Date {
  const daysFromEquinox = (targetLongitude / 360) * 365.25
  const marchEquinox = new Date(year, 2, 20)
  const estimatedDate = new Date(
    marchEquinox.getTime() + daysFromEquinox * 86400000,
  )

  let low = new Date(estimatedDate.getTime() - 5 * 86400000)
  let high = new Date(estimatedDate.getTime() + 5 * 86400000)

  for (let i = 0; i < 20; i++) {
    const mid = new Date((low.getTime() + high.getTime()) / 2)
    const longitude = getSolarLongitude(mid)

    let diff = longitude - targetLongitude
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360

    if (Math.abs(diff) < 0.01) {
      return mid
    }

    if (diff < 0) {
      low = mid
    } else {
      high = mid
    }
  }

  return estimatedDate
}

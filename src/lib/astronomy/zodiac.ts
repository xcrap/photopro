const ZODIAC_SIGNS = [
  { sign: 'Aries', symbol: '\u2648', startDeg: 0 },
  { sign: 'Taurus', symbol: '\u2649', startDeg: 30 },
  { sign: 'Gemini', symbol: '\u264A', startDeg: 60 },
  { sign: 'Cancer', symbol: '\u264B', startDeg: 90 },
  { sign: 'Leo', symbol: '\u264C', startDeg: 120 },
  { sign: 'Virgo', symbol: '\u264D', startDeg: 150 },
  { sign: 'Libra', symbol: '\u264E', startDeg: 180 },
  { sign: 'Scorpio', symbol: '\u264F', startDeg: 210 },
  { sign: 'Sagittarius', symbol: '\u2650', startDeg: 240 },
  { sign: 'Capricorn', symbol: '\u2651', startDeg: 270 },
  { sign: 'Aquarius', symbol: '\u2652', startDeg: 300 },
  { sign: 'Pisces', symbol: '\u2653', startDeg: 330 },
] as const

/**
 * Get the zodiac sign for a given date based on the approximate ecliptic longitude of the sun.
 * Uses a simplified astronomical calculation (not astrological dates).
 */
export function getZodiacSign(date: Date): { sign: string; symbol: string } {
  const eclipticLongitude = getEclipticLongitude(date)

  // Find the zodiac sign whose range contains this longitude
  for (let i = ZODIAC_SIGNS.length - 1; i >= 0; i--) {
    if (eclipticLongitude >= ZODIAC_SIGNS[i].startDeg) {
      return { sign: ZODIAC_SIGNS[i].sign, symbol: ZODIAC_SIGNS[i].symbol }
    }
  }

  // Fallback (should not happen, but satisfies type checker)
  return { sign: ZODIAC_SIGNS[0].sign, symbol: ZODIAC_SIGNS[0].symbol }
}

/**
 * Calculate the approximate ecliptic longitude of the moon for zodiac sign determination.
 * This is a rough approximation suitable for display purposes.
 */
export function getMoonZodiacSign(date: Date): string {
  const moonLongitude = getApproxMoonEclipticLongitude(date)

  for (let i = ZODIAC_SIGNS.length - 1; i >= 0; i--) {
    if (moonLongitude >= ZODIAC_SIGNS[i].startDeg) {
      return ZODIAC_SIGNS[i].sign
    }
  }

  return ZODIAC_SIGNS[0].sign
}

/**
 * Approximate the sun's ecliptic longitude for a given date.
 * Based on a simplified solar position algorithm.
 */
function getEclipticLongitude(date: Date): number {
  // Days since J2000.0 epoch (2000-01-01 12:00 UTC)
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
  const daysSinceJ2000 = (date.getTime() - J2000) / (1000 * 60 * 60 * 24)

  // Mean longitude of the sun (degrees)
  const L = (280.460 + 0.9856474 * daysSinceJ2000) % 360

  // Mean anomaly of the sun (degrees)
  const g = ((357.528 + 0.9856003 * daysSinceJ2000) % 360) * (Math.PI / 180)

  // Ecliptic longitude (degrees)
  const eclipticLon = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360

  return eclipticLon < 0 ? eclipticLon + 360 : eclipticLon
}

/**
 * Approximate the moon's ecliptic longitude for a given date.
 * Uses a simplified lunar position calculation.
 */
function getApproxMoonEclipticLongitude(date: Date): number {
  // Days since J2000.0 epoch
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
  const d = (date.getTime() - J2000) / (1000 * 60 * 60 * 24)

  // Simplified lunar longitude calculation
  const L = (218.316 + 13.176396 * d) % 360 // Mean longitude
  const M = (134.963 + 13.064993 * d) % 360 // Mean anomaly
  const F = (93.272 + 13.229350 * d) % 360  // Mean distance

  const Mrad = M * (Math.PI / 180)
  const Frad = F * (Math.PI / 180)

  // Ecliptic longitude with correction terms
  const longitude = L + 6.289 * Math.sin(Mrad)
    + 1.274 * Math.sin(2 * Frad - Mrad)
    + 0.658 * Math.sin(2 * Frad)

  const normalized = longitude % 360
  return normalized < 0 ? normalized + 360 : normalized
}

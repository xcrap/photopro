export type VisibilityRating = 'excellent' | 'good' | 'poor' | 'not-visible'

/**
 * Calculate maximum altitude an object can reach from a given latitude.
 */
export function getMaxAltitude(
  userLatitude: number,
  objectDeclination: number,
): number {
  return 90 - Math.abs(userLatitude - objectDeclination)
}

/**
 * Get visibility rating based on maximum altitude.
 */
export function getVisibilityRating(maxAltitude: number): VisibilityRating {
  if (maxAltitude >= 45) return 'excellent'
  if (maxAltitude >= 25) return 'good'
  if (maxAltitude >= 10) return 'poor'
  return 'not-visible'
}

/**
 * Get visibility label for display.
 */
export function getVisibilityLabel(rating: VisibilityRating): string {
  switch (rating) {
    case 'excellent':
      return 'Excellent visibility'
    case 'good':
      return 'Good visibility'
    case 'poor':
      return 'Low on horizon'
    case 'not-visible':
      return 'Not visible from your location'
  }
}

/**
 * Check if a comet is visible from a given latitude.
 */
export function isCometVisible(
  comet: {
    visibility: {
      minLatitude?: number
      hemisphere?: string
      declinationRange?: { min: number; max: number }
    }
  },
  userLatitude: number,
): boolean {
  const { visibility } = comet

  if (visibility.hemisphere === 'northern' && userLatitude < 0) return false
  if (visibility.hemisphere === 'southern' && userLatitude > 0) return false

  if (visibility.minLatitude !== undefined) {
    if (
      visibility.hemisphere === 'northern' &&
      userLatitude < visibility.minLatitude
    )
      return false
    if (
      visibility.hemisphere === 'southern' &&
      userLatitude > -visibility.minLatitude
    )
      return false
  }

  if (visibility.declinationRange) {
    const avgDec =
      (visibility.declinationRange.min + visibility.declinationRange.max) / 2
    const maxAlt = getMaxAltitude(userLatitude, avgDec)
    if (maxAlt < 10) return false
  }

  return true
}

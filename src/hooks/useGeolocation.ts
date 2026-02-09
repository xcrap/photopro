import { useCallback, useEffect, useState } from 'react'
import { useLocationStore } from '@/stores/location-store'

interface UseGeolocationOptions {
  autoRequest?: boolean
}

export function useGeolocation({ autoRequest = true }: UseGeolocationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const gpsEnabled = useLocationStore((s) => s.gpsEnabled)
  const setLocation = useLocationStore((s) => s.setLocation)
  const setGpsStatus = useLocationStore((s) => s.setGpsStatus)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      return
    }

    setIsLoading(true)
    setGpsStatus('requesting')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Ignore late GPS results when the user switched to manual mode.
        if (!useLocationStore.getState().gpsEnabled) {
          setIsLoading(false)
          return
        }

        setLocation(position.coords.latitude, position.coords.longitude)
        setGpsStatus('granted')
        setIsLoading(false)
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied')
        } else {
          setGpsStatus('error')
        }
        setIsLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    )
  }, [setLocation, setGpsStatus])

  useEffect(() => {
    if (!(autoRequest && gpsEnabled)) return

    const timeoutId = window.setTimeout(() => {
      requestLocation()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [autoRequest, gpsEnabled, requestLocation])

  return { requestLocation, isLoading }
}

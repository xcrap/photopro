import { useCallback, useEffect, useState } from 'react'
import { useLocationStore } from '@/stores/location-store'

export function useGeolocation() {
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
    if (gpsEnabled) {
      requestLocation()
    }
  }, [gpsEnabled, requestLocation])

  return { requestLocation, isLoading }
}

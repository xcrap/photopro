import { useEffect, useState } from 'react'

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60_000)

    return () => clearInterval(interval)
  }, [])

  return currentTime
}

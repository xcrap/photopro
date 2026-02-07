import { MapPin, MapPinOff, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLocationStore } from '@/stores/location-store'

export function GpsStatusBadge() {
  const { gpsStatus, name, latitude, longitude } = useLocationStore()

  const isLoading = gpsStatus === 'requesting'
  const isGranted = gpsStatus === 'granted'
  const locationText = name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-border/50"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : isGranted ? (
        <MapPin className="h-3 w-3 text-emerald-400" />
      ) : (
        <MapPinOff className="h-3 w-3 text-muted-foreground" />
      )}
      <span className="max-w-[180px] truncate text-xs">{locationText}</span>
    </Badge>
  )
}

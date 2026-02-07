import { Menu, Moon, MapPin, MapPinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocationStore } from '@/stores/location-store'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { gpsStatus } = useLocationStore()

  const isGps = gpsStatus === 'granted'
  const GpsIcon = isGps ? MapPin : MapPinOff
  const gpsColor = isGps
    ? 'text-emerald-400'
    : gpsStatus === 'denied' || gpsStatus === 'error'
      ? 'text-red-400'
      : 'text-muted-foreground'

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Moon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-lg font-semibold tracking-tight">PhotoPro</span>
        </div>

        <div className="ml-auto">
          <Badge variant="outline" className="gap-1.5 border-border/50 text-xs">
            <GpsIcon className={`h-3 w-3 ${gpsColor}`} />
            {isGps ? 'GPS' : 'Manual'}
          </Badge>
        </div>
      </div>
    </header>
  )
}

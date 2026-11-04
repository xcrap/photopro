import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocationStore } from '@/stores/location-store'
import { useTimeZone } from '@/hooks/useTimeZone'
import { getDeviceTimeZone } from '@/lib/time/zone'
import { formatTimeZoneLabel } from '@/lib/formatting'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const gpsEnabled = useLocationStore((s) => s.gpsEnabled)
  const gpsStatus = useLocationStore((s) => s.gpsStatus)
  const timeZone = useTimeZone()

  const isGps = gpsEnabled && gpsStatus === 'granted'
  const isLocating = gpsEnabled && gpsStatus === 'requesting'
  // Times follow the location's zone; flag it when it differs from the device.
  const zoneLabel = timeZone !== getDeviceTimeZone() ? formatTimeZoneLabel(new Date(), timeZone) : null

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl md:hidden"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="text-lg font-bold tracking-tighter text-foreground bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">PhotoPro</span>

        <div className="ml-auto flex items-center gap-2">
          {zoneLabel && (
            <span
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              title={`Times shown in ${timeZone}`}
            >
              {zoneLabel}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
              isGps
                ? 'border-proximity/30 bg-proximity/12 text-proximity'
                : 'border-white/[0.08] bg-white/[0.04] text-muted-foreground/90'
            }`}
          >
            {isGps ? 'GPS' : isLocating ? 'Locating…' : 'Manual'}
          </span>
        </div>
      </div>
    </header>
  )
}

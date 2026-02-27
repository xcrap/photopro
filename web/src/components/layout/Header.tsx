import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocationStore } from '@/stores/location-store'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { gpsEnabled, gpsStatus } = useLocationStore()

  const isGps = gpsEnabled && gpsStatus === 'granted'

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="text-lg font-bold tracking-tighter text-foreground bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">PhotoPro</span>

        <div className="ml-auto">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
              isGps
                ? 'border-proximity/30 bg-proximity/12 text-proximity'
                : 'border-white/[0.08] bg-white/[0.04] text-muted-foreground/90'
            }`}
          >
            {isGps ? 'GPS' : 'Manual'}
          </span>
        </div>
      </div>
    </header>
  )
}

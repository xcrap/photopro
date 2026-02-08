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
    <header className="sticky top-0 z-50 border-b border-white/[0.03] bg-[#0a0b14]/90 backdrop-blur-2xl">
      <div className="flex h-14 items-center gap-4 px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <span className="text-[17px] font-semibold tracking-tight text-foreground">PhotoPro</span>

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

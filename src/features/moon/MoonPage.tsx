import { useMemo } from 'react'
import { Moon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useCurrentTime } from '@/hooks/useCurrentTime'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { findFullMoons } from '@/lib/astronomy/full-moon-finder'
import { findProximityEvents } from '@/lib/astronomy/proximity-finder'
import { findSpecialEvents } from '@/lib/astronomy/special-events'
import { MoonCurrentTab } from './MoonCurrentTab'
import { MoonFullMoonsTab } from './MoonFullMoonsTab'
import { MoonProximityTab } from './MoonProximityTab'
import { MoonEclipsesTab } from './MoonEclipsesTab'
import { MoonSpecialTab } from './MoonSpecialTab'

export function MoonPage() {
  const now = useCurrentTime()
  const { latitude, longitude } = useLocationStore()
  const { eclipseYearsRange } = useSettingsStore()

  const moonData = useMemo(() => getMoonData(now, latitude, longitude), [now, latitude, longitude])
  const fullMoons = useMemo(() => findFullMoons(now, 12), [now])
  const proximityEvents = useMemo(
    () => findProximityEvents(now, 365, latitude, longitude),
    [now, latitude, longitude],
  )
  const specialEvents = useMemo(() => findSpecialEvents(now, 24), [now])

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Moon"
        description="Phases, events & opportunities"
        icon={<Moon className="h-4 w-4" />}
      />

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0">
          <TabsTrigger value="current" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Current
          </TabsTrigger>
          <TabsTrigger value="full-moons" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Full Moons
          </TabsTrigger>
          <TabsTrigger value="proximity" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="eclipses" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Eclipses
          </TabsTrigger>
          <TabsTrigger value="special" className="rounded-full border border-transparent px-3.5 py-1.5 text-[14px] data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Special
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <MoonCurrentTab moonData={moonData} now={now} />
        </TabsContent>

        <TabsContent value="full-moons">
          <MoonFullMoonsTab fullMoons={fullMoons} />
        </TabsContent>

        <TabsContent value="proximity">
          <MoonProximityTab events={proximityEvents} />
        </TabsContent>

        <TabsContent value="eclipses">
          <MoonEclipsesTab yearsRange={eclipseYearsRange} />
        </TabsContent>

        <TabsContent value="special">
          <MoonSpecialTab events={specialEvents} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useMemo } from 'react'
import { Moon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { DateNavigator } from '@/components/shared/DateNavigator'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useSelectedDate } from '@/hooks/useSelectedDate'
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
  const { selectedDate, isToday, goToPreviousDay, goToNextDay, goToToday, goToDate } = useSelectedDate()
  const { latitude, longitude } = useLocationStore()
  const { eclipseYearsRange } = useSettingsStore()

  const moonData = useMemo(() => getMoonData(selectedDate, latitude, longitude), [selectedDate, latitude, longitude])
  const fullMoons = useMemo(() => findFullMoons(selectedDate, 12), [selectedDate])
  const proximityEvents = useMemo(
    () => findProximityEvents(selectedDate, 365, latitude, longitude),
    [selectedDate, latitude, longitude],
  )
  const specialEvents = useMemo(() => findSpecialEvents(selectedDate, 24), [selectedDate])

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Moon"
        description="Phases, events & opportunities"
        icon={<Moon className="h-4 w-4" />}
        action={
          <DateNavigator
            date={selectedDate}
            isToday={isToday}
            onPrevious={goToPreviousDay}
            onNext={goToNextDay}
            onToday={goToToday}
            onDateSelect={goToDate}
          />
        }
      />

      <Tabs defaultValue="current" className="space-y-4 overflow-hidden">
        <TabsList className="no-scrollbar flex h-auto w-full gap-1 overflow-x-auto bg-transparent p-0">
          <TabsTrigger value="current" className="shrink-0 grow-0 basis-auto rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Current
          </TabsTrigger>
          <TabsTrigger value="full-moons" className="shrink-0 grow-0 basis-auto rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Full Moons
          </TabsTrigger>
          <TabsTrigger value="proximity" className="shrink-0 grow-0 basis-auto rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="eclipses" className="shrink-0 grow-0 basis-auto rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Eclipses
          </TabsTrigger>
          <TabsTrigger value="special" className="shrink-0 grow-0 basis-auto rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]">
            Special
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <MoonCurrentTab moonData={moonData} now={selectedDate} />
        </TabsContent>

        <TabsContent value="full-moons">
          <MoonFullMoonsTab fullMoons={fullMoons} now={selectedDate} />
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

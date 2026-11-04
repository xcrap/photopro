import { useState, useMemo } from 'react'
import { Moon } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

const tabs = [
  { value: 'current', label: 'Current' },
  { value: 'full-moons', label: 'Full Moons' },
  { value: 'proximity', label: 'Opportunities' },
  { value: 'eclipses', label: 'Eclipses' },
  { value: 'special', label: 'Special' },
] as const

export function MoonPage() {
  const { selectedDate, selectedDayStart, timeZone, isToday, goToPreviousDay, goToNextDay, goToToday, goToDate } = useSelectedDate()
  const latitude = useLocationStore((s) => s.latitude)
  const longitude = useLocationStore((s) => s.longitude)
  const { eclipseYearsRange } = useSettingsStore()
  const [activeTab, setActiveTab] = useState('current')

  const moonData = useMemo(
    () => getMoonData(selectedDate, latitude, longitude, timeZone),
    [selectedDate, latitude, longitude, timeZone],
  )
  // Heavy scans: keyed on the local day, not the per-minute clock, and only for the open tab.
  const fullMoons = useMemo(
    () => (activeTab === 'full-moons' ? findFullMoons(selectedDayStart, 12, timeZone) : []),
    [activeTab, selectedDayStart, timeZone],
  )
  const proximityEvents = useMemo(
    () => (activeTab === 'proximity' ? findProximityEvents(selectedDayStart, 365, latitude, longitude, timeZone) : []),
    [activeTab, selectedDayStart, latitude, longitude, timeZone],
  )
  const specialEvents = useMemo(
    () => (activeTab === 'special' ? findSpecialEvents(selectedDayStart, 24, timeZone) : []),
    [activeTab, selectedDayStart, timeZone],
  )

  return (
    <div className="space-y-5">
      <div className="animate-in-1">
        <SectionHeader
          title="Moon"
          description="Phases, events & opportunities"
          icon={<Moon className="h-4 w-4" />}
          action={
            <DateNavigator
              date={selectedDate}
              timeZone={timeZone}
              isToday={isToday}
              onPrevious={goToPreviousDay}
              onNext={goToNextDay}
              onToday={goToToday}
              onDateSelect={goToDate}
            />
          }
        />
      </div>

      <div className="animate-in-2 space-y-4">
        {/* Mobile: Select dropdown */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden md:block">
          <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full border border-transparent px-3.5 py-1.5 text-sm data-[state=active]:border-white/[0.06] data-[state=active]:bg-white/[0.05]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Shared content */}
        {activeTab === 'current' && (
          <MoonCurrentTab moonData={moonData} now={selectedDate} dayStart={selectedDayStart} timeZone={timeZone} />
        )}
        {activeTab === 'full-moons' && <MoonFullMoonsTab fullMoons={fullMoons} now={selectedDate} timeZone={timeZone} />}
        {activeTab === 'proximity' && <MoonProximityTab events={proximityEvents} timeZone={timeZone} />}
        {activeTab === 'eclipses' && <MoonEclipsesTab yearsRange={eclipseYearsRange} timeZone={timeZone} />}
        {activeTab === 'special' && <MoonSpecialTab events={specialEvents} timeZone={timeZone} />}
      </div>
    </div>
  )
}

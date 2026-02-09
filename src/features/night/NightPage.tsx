import { useEffect, useState } from 'react'
import { Stars } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { useLocationStore } from '@/stores/location-store'
import { useWeatherStore } from '@/stores/weather-store'
import { NightMeteorsTab } from './NightMeteorsTab'
import { NightCometsTab } from './NightCometsTab'

const tabs = [
  { value: 'meteors', label: 'Meteor Showers' },
  { value: 'comets', label: 'Comets' },
] as const

export function NightPage() {
  const { latitude, longitude } = useLocationStore()
  const fetchForecast = useWeatherStore((state) => state.fetchForecast)
  const [activeTab, setActiveTab] = useState('meteors')

  useEffect(() => {
    void fetchForecast(latitude, longitude)
  }, [fetchForecast, latitude, longitude])

  return (
    <div className="space-y-5">
      <div className="animate-in-1">
        <SectionHeader
          title="Night Sky"
          description="Meteor showers & comets"
          icon={<Stars className="h-4 w-4" />}
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
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="hidden md:block"
        >
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

        {activeTab === 'meteors' && <NightMeteorsTab />}
        {activeTab === 'comets' && <NightCometsTab />}
      </div>
    </div>
  )
}

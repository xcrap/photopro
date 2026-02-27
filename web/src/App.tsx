import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeatureErrorBoundary } from '@/components/shared/FeatureErrorBoundary'
import { HomePage } from '@/features/home/HomePage'
import { MoonPage } from '@/features/moon/MoonPage'
import { SunPage } from '@/features/sun/SunPage'
import { NightPage } from '@/features/night/NightPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WeatherPage } from '@/features/weather/WeatherPage'

function withFeatureBoundary(section: string, element: ReactElement) {
  return (
    <FeatureErrorBoundary section={section}>
      {element}
    </FeatureErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={withFeatureBoundary('Dashboard', <HomePage />)} />
          <Route path="/moon" element={withFeatureBoundary('Moon', <MoonPage />)} />
          <Route path="/sun" element={withFeatureBoundary('Sun', <SunPage />)} />
          <Route path="/night" element={withFeatureBoundary('Night', <NightPage />)} />
          <Route path="/weather" element={withFeatureBoundary('Weather', <WeatherPage />)} />
          <Route path="/settings" element={withFeatureBoundary('Settings', <SettingsPage />)} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

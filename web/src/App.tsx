import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { FeatureErrorBoundary } from '@/components/shared/FeatureErrorBoundary'

// Route-level code splitting: each page (and the data it bundles) loads on first visit.
const HomePage = lazy(() => import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })))
const MoonPage = lazy(() => import('@/features/moon/MoonPage').then((m) => ({ default: m.MoonPage })))
const SunPage = lazy(() => import('@/features/sun/SunPage').then((m) => ({ default: m.SunPage })))
const NightPage = lazy(() => import('@/features/night/NightPage').then((m) => ({ default: m.NightPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const WeatherPage = lazy(() => import('@/features/weather/WeatherPage').then((m) => ({ default: m.WeatherPage })))

function PageFallback() {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground" role="status">
      Loading…
    </div>
  )
}

function withFeatureBoundary(section: string, element: ReactElement) {
  return (
    <FeatureErrorBoundary section={section}>
      <Suspense fallback={<PageFallback />}>{element}</Suspense>
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

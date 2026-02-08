import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/features/home/HomePage'
import { MoonPage } from '@/features/moon/MoonPage'
import { SunPage } from '@/features/sun/SunPage'
import { NightPage } from '@/features/night/NightPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { WeatherPage } from '@/features/weather/WeatherPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/moon" element={<MoonPage />} />
          <Route path="/sun" element={<SunPage />} />
          <Route path="/night" element={<NightPage />} />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

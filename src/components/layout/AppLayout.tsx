import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { DesktopNav } from './DesktopNav'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useTheme } from '@/hooks/useTheme'

export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  useGeolocation()
  useTheme()

  return (
    <div className="flex h-dvh flex-col">
      <Header onMenuClick={() => setNavOpen(true)} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex flex-1 overflow-hidden">
        <DesktopNav />
        <ScrollArea className="flex-1 min-w-0">
          <main className="mx-auto max-w-3xl p-4 pb-20 md:p-6">
            <Outlet />
          </main>
        </ScrollArea>
      </div>
    </div>
  )
}

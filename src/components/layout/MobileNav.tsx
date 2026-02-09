import { NavLink } from 'react-router-dom'
import { Home, Moon, Sun, Stars, CloudSun, Settings } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/weather', label: 'Weather', icon: CloudSun },
  { to: '/sun', label: 'Sun', icon: Sun },
  { to: '/moon', label: 'Moon', icon: Moon },
  { to: '/night', label: 'Night', icon: Stars },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 border-r border-white/10 bg-background/90 backdrop-blur-2xl p-0">
        <SheetHeader className="px-6 pt-8 pb-6">
          <SheetTitle className="text-[18px] font-semibold tracking-tight text-foreground">
            PhotoPro
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-[13px] tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.05] font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-white/[0.02] hover:text-foreground/70'
                }`
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}

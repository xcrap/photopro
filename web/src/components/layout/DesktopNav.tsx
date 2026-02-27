import { NavLink } from 'react-router-dom'
import { Home, Moon, Sun, Stars, CloudSun, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/weather', label: 'Weather', icon: CloudSun },
  { to: '/sun', label: 'Sun', icon: Sun },
  { to: '/moon', label: 'Moon', icon: Moon },
  { to: '/night', label: 'Night', icon: Stars },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function DesktopNav() {
  return (
    <nav className="hidden border-r border-white/5 bg-background/30 backdrop-blur-xl md:flex md:w-64 md:flex-col">
      <div className="flex flex-col gap-0.5 p-4 pt-5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] tracking-wide transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 font-medium text-foreground shadow-sm ring-1 ring-white/10'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

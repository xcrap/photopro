import { NavLink } from 'react-router-dom'
import { Home, Moon, Sun, Settings } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/moon', label: 'Moon', icon: Moon },
  { to: '/sun', label: 'Sun', icon: Sun },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function DesktopNav() {
  return (
    <nav className="hidden border-r border-white/[0.03] bg-[#0a0b14] md:flex md:w-56 md:flex-col">
      <div className="flex flex-col gap-0.5 p-4 pt-5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] tracking-wide transition-all duration-200 ${
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
      </div>
    </nav>
  )
}

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
    <nav className="hidden border-r border-border/50 bg-card/30 md:flex md:w-56 md:flex-col">
      <div className="flex flex-col gap-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

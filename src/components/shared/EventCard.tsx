import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EventCardProps {
  title: string
  date: string
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive'
  icon?: ReactNode
  children: ReactNode
  className?: string
  accentColor?: string
}

export function EventCard({
  title,
  date,
  badge,
  badgeVariant = 'secondary',
  icon,
  children,
  className = '',
  accentColor,
}: EventCardProps) {
  return (
    <Card
      className={`overflow-hidden transition-colors hover:bg-card/80 ${className}`}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="text-muted-foreground">{icon}</span>
            )}
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
            </div>
          </div>
          {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}

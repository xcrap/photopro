import type { ReactNode } from 'react'

interface InfoRowProps {
  icon?: ReactNode
  label: string
  value: string | ReactNode
  sublabel?: string
  className?: string
}

export function InfoRow({ icon, label, value, sublabel, className = '' }: InfoRowProps) {
  return (
    <div className={`flex items-center justify-between py-2 ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
            {icon}
          </span>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground/60">{sublabel}</p>
          )}
        </div>
      </div>
      <div className="text-right text-sm font-medium">{value}</div>
    </div>
  )
}

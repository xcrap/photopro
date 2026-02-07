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
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] text-muted-foreground">
            {icon}
          </span>
        )}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sublabel && (
            <p className="text-xs text-muted-foreground/40">{sublabel}</p>
          )}
        </div>
      </div>
      <div className="text-right text-sm font-medium tabular-nums tracking-tight text-foreground/90">{value}</div>
    </div>
  )
}

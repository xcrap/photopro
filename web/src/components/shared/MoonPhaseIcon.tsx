import { useId } from 'react'

interface MoonPhaseIconProps {
  phase: number
  size?: number
  tiltAngle?: number
  className?: string
}

export function MoonPhaseIcon({ phase, size = 64, tiltAngle = 0, className = '' }: MoonPhaseIconProps) {
  const uid = useId().replace(/:/g, '')
  const r = size / 2 - 1
  const cx = size / 2
  const cy = size / 2

  const normalizedPhase = ((phase % 1) + 1) % 1
  const illumination = normalizedPhase <= 0.5 ? normalizedPhase * 2 : (1 - normalizedPhase) * 2
  const isWaxing = normalizedPhase <= 0.5
  const terminatorRx = Math.max(Math.abs(r * (1 - 2 * illumination)), 0.01)

  let illuminatedPath: string

  if (normalizedPhase < 0.01 || normalizedPhase > 0.99) {
    illuminatedPath = ''
  } else if (Math.abs(normalizedPhase - 0.5) < 0.01) {
    illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`
  } else if (isWaxing) {
    const litEdge = `A ${r} ${r} 0 0 1 ${cx} ${cy + r}`
    const terminatorSweep = illumination <= 0.5 ? 0 : 1
    const terminator = `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`
    illuminatedPath = `M ${cx} ${cy - r} ${litEdge} ${terminator}`
  } else {
    const litEdge = `A ${r} ${r} 0 0 0 ${cx} ${cy + r}`
    const terminatorSweep = illumination <= 0.5 ? 1 : 0
    const terminator = `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`
    illuminatedPath = `M ${cx} ${cy - r} ${litEdge} ${terminator}`
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`block ${className}`}
    >
      <defs>
        <radialGradient id={`${uid}-lit`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#ddd8ce" />
          <stop offset="60%" stopColor="#b8b3a6" />
          <stop offset="100%" stopColor="#9a9589" />
        </radialGradient>
        <radialGradient id={`${uid}-dark`} cx="55%" cy="45%" r="55%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <g transform={`rotate(${tiltAngle}, ${cx}, ${cy})`}>
        {/* Dark side */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#${uid}-dark)`} />
        {/* Lit side */}
        {illuminatedPath && (
          <path d={illuminatedPath} fill={`url(#${uid}-lit)`} />
        )}
      </g>
      {/* Rim light */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(168,184,216,0.08)"
        strokeWidth={0.75}
      />
    </svg>
  )
}

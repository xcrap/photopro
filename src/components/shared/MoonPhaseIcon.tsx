interface MoonPhaseIconProps {
  phase: number
  size?: number
  className?: string
}

export function MoonPhaseIcon({ phase, size = 64, className = '' }: MoonPhaseIconProps) {
  // phase: 0 = new moon, 0.5 = full moon, 1 = new moon again
  const r = size / 2 - 2
  const cx = size / 2
  const cy = size / 2

  // illumination: 0 at new moon, 1 at full moon
  const illumination = phase <= 0.5 ? phase * 2 : (1 - phase) * 2
  const isWaxing = phase <= 0.5

  // Terminator ellipse rx: controls how curved the shadow edge is
  const terminatorRx = Math.abs(r * (1 - 2 * illumination))

  let illuminatedPath: string

  if (phase < 0.01 || phase > 0.99) {
    // New moon - no illumination
    illuminatedPath = ''
  } else if (Math.abs(phase - 0.5) < 0.01) {
    // Full moon - full circle
    illuminatedPath = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`
  } else if (isWaxing) {
    // Waxing: right side illuminated
    // Lit edge: top → bottom via right side (clockwise, sweep=1)
    const litEdge = `A ${r} ${r} 0 0 1 ${cx} ${cy + r}`
    // Terminator: bottom → top
    // Crescent (illum<0.5): curves right (counter-clockwise=0)
    // Gibbous (illum>0.5): curves left (clockwise=1)
    const terminatorSweep = illumination <= 0.5 ? 0 : 1
    const terminator = `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`
    illuminatedPath = `M ${cx} ${cy - r} ${litEdge} ${terminator}`
  } else {
    // Waning: left side illuminated
    // Lit edge: top → bottom via left side (counter-clockwise, sweep=0)
    const litEdge = `A ${r} ${r} 0 0 0 ${cx} ${cy + r}`
    // Terminator: bottom → top
    // Crescent (illum<0.5): curves left (clockwise=1)
    // Gibbous (illum>0.5): curves right (counter-clockwise=0)
    const terminatorSweep = illumination <= 0.5 ? 1 : 0
    const terminator = `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${cy - r}`
    illuminatedPath = `M ${cx} ${cy - r} ${litEdge} ${terminator}`
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      {/* Moon background (dark side) */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="oklch(0.25 0.02 260)"
        stroke="oklch(0.4 0.03 270)"
        strokeWidth={1}
      />
      {/* Illuminated portion */}
      {illuminatedPath && (
        <path
          d={illuminatedPath}
          fill="oklch(0.90 0.04 85)"
          opacity={0.95}
        />
      )}
      {/* Subtle glow */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="oklch(0.85 0.06 85 / 0.2)"
        strokeWidth={2}
      />
    </svg>
  )
}

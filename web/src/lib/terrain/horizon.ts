import { useEffect, useRef, useState } from 'react'
import SunCalc from 'suncalc'
import type { HorizonJob, HorizonResult } from './terrain'

export type { HorizonResult }

/**
 * Real first/last light over the terrain skyline (ported from Waka Sun).
 * See ALGORITHM.md → "Terrain Horizon (Real First/Last Light)".
 */

const RAD = Math.PI / 180
const SCAN_STEP_MINUTES = 2
const REFINE_TO_MS = 5000
const SEMI_DIAMETER = { sun: 0.27, moon: 0.26 } as const

export type Body = 'sun' | 'moon'

let worker: Worker | null = null
let nextId = 0
const listeners = new Set<(result: HorizonResult) => void>()

function horizonWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./horizon.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<HorizonResult>) => {
      for (const listener of listeners) listener(event.data)
    }
  }
  return worker
}

/** The skyline around a point; recomputed only when the point moves. */
export function useHorizon(lat: number, lng: number, enabled = true) {
  const [result, setResult] = useState<HorizonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const pending = useRef(0)

  useEffect(() => {
    const listener = (value: HorizonResult) => {
      if (value.id !== pending.current) return
      setResult(value)
      setLoading(false)
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    // Wait for the pin to settle before fetching terrain.
    const timer = setTimeout(() => {
      const id = ++nextId
      pending.current = id
      setLoading(true)
      horizonWorker().postMessage({ id, lat, lng } satisfies HorizonJob)
    }, 250)
    return () => clearTimeout(timer)
  }, [lat, lng, enabled])

  const current = result && result.lat === lat && result.lng === lng ? result : null
  return { horizon: current, loading: enabled && (loading || !current) }
}

/** Skyline altitude (degrees) at an azimuth (degrees from north), interpolated. */
export function skylineAt(h: HorizonResult, azimuth: number): number {
  const steps = h.angles.length
  const x = ((((azimuth % 360) + 360) % 360) / 360) * steps
  const i = Math.floor(x) % steps
  const j = (i + 1) % steps
  const f = x - Math.floor(x)
  return h.angles[i] * (1 - f) + h.angles[j] * f
}

function nearestRay(h: HorizonResult, azimuth: number): number {
  return Math.round(((((azimuth % 360) + 360) % 360) / 360) * h.angles.length) % h.angles.length
}
export const skylineDistance = (h: HorizonResult, azimuth: number) => h.distances[nearestRay(h, azimuth)]
export const skylineIsSea = (h: HorizonResult, azimuth: number) => h.sea[nearestRay(h, azimuth)] === 1

/** Astronomical refraction (radians) for a true altitude in radians (Bennett, as SunCalc). */
function astroRefraction(h: number): number {
  const altitude = Math.max(0, h)
  return 0.0002967 / Math.tan(altitude + 0.00312536 / (altitude + 0.08901179))
}

/** Apparent altitude and azimuth from north, in degrees. */
export function bodyPosition(body: Body, at: Date, lat: number, lng: number) {
  if (body === 'sun') {
    const pos = SunCalc.getPosition(at, lat, lng)
    return {
      altitude: (pos.altitude + astroRefraction(pos.altitude)) / RAD,
      azimuth: (pos.azimuth / RAD + 180) % 360,
    }
  }
  // SunCalc's moon altitude already includes refraction.
  const pos = SunCalc.getMoonPosition(at, lat, lng)
  return { altitude: pos.altitude / RAD, azimuth: (pos.azimuth / RAD + 180) % 360 }
}

function isVisible(h: HorizonResult, body: Body, at: Date): boolean {
  const pos = bodyPosition(body, at, h.lat, h.lng)
  return pos.altitude + SEMI_DIAMETER[body] > skylineAt(h, pos.azimuth)
}

function refine(h: HorizonResult, body: Body, before: number, after: number, rising: boolean): Date {
  let lo = before
  let hi = after
  while (hi - lo > REFINE_TO_MS) {
    const mid = (lo + hi) / 2
    if (isVisible(h, body, new Date(mid)) === rising) hi = mid
    else lo = mid
  }
  return new Date((lo + hi) / 2)
}

export interface TerrainLight {
  /** First moment the body's upper limb clears the skyline. */
  firstLight: Date | null
  /** Last moment before it drops behind the skyline. */
  lastLight: Date | null
  /** Minutes of the day the body is above the skyline. */
  minutes: number
}

/** Scan the local day starting at `dayStart` (local midnight instant). */
export function terrainLight(h: HorizonResult, body: Body, dayStart: Date): TerrainLight {
  const start = dayStart.getTime()
  const stepMs = SCAN_STEP_MINUTES * 60_000
  let previous: { t: number; up: boolean } | null = null
  let firstLight: Date | null = null
  let lastLight: Date | null = null
  let minutes = 0

  for (let m = 0; m <= 1440; m += SCAN_STEP_MINUTES) {
    const t = start + m * 60_000
    const up = isVisible(h, body, new Date(t))
    if (up && m < 1440) minutes += SCAN_STEP_MINUTES
    if (previous && up !== previous.up) {
      const edge = refine(h, body, previous.t, previous.t + stepMs, up)
      if (up && !firstLight) firstLight = edge
      if (!up) lastLight = edge
    }
    previous = { t, up }
  }

  return { firstLight, lastLight, minutes }
}

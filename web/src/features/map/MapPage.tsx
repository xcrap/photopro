import { useEffect, useMemo, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibre, Marker, setWorkerUrl } from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import type { Feature } from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Layers, Map as MapIcon, Moon, Mountain, Sun } from 'lucide-react'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { DateNavigator } from '@/components/shared/DateNavigator'
import { PlaceSearch } from '@/components/shared/PlaceSearch'
import { TerrainRows } from '@/features/terrain/TerrainCard'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { getSunTimes } from '@/lib/astronomy/sun-calculator'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { bodyPosition, useHorizon } from '@/lib/terrain/horizon'
import { TERRAIN_TILES } from '@/lib/terrain/terrain'
import { bearingLine, compass, destination, metersPerPixel } from '@/lib/geo/bearing'
import { skyDistance, skyPath, skyPosition } from '@/lib/geo/sky-path'
import { addLocalDays } from '@/lib/time/zone'
import { formatTime } from '@/lib/formatting'
import { getPolarLabel } from '@/lib/astronomy/sun-calculator'
import { cn } from '@/lib/utils'

setWorkerUrl(workerUrl)

// OpenFreeMap: free OpenStreetMap vector tiles with no key; "dark" suits the app theme.
const STYLE = 'https://tiles.openfreemap.org/styles/dark'
const IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const START_ZOOM = 11

type RayKind =
  | 'sunrise'
  | 'sunset'
  | 'sun'
  | 'sun-below'
  | 'moonrise'
  | 'moonset'
  | 'moon'
  | 'moon-below'

interface Ray {
  kind: RayKind
  azimuth: number
  time: Date
  /** Apparent altitude, for the "now" rays. */
  altitude?: number
}

/** The body whose rays and rows are shown — one at a time, never mixed. */
type Bodies = 'sun' | 'moon'
const BODY_OPTIONS: Array<{ value: Bodies; label: string }> = [
  { value: 'sun', label: 'Sun' },
  { value: 'moon', label: 'Moon' },
]
const MOON_KINDS: RayKind[] = ['moonrise', 'moonset', 'moon', 'moon-below']
const isMoonRay = (ray: Ray) => MOON_KINDS.includes(ray.kind)
const isNowRay = (ray: Ray) => ray.altitude !== undefined

/** Today's path across the sky and the body's disc on it. */
const PATH_COLOR = { sun: '#facc15', moon: '#a8b8d8' } as const
const DISC_COLOR = { sun: '#f59e0b', moon: '#e2e8f0' } as const

/** Two taps within this many ms and pixels count as a double tap (touch or mouse). */
const DOUBLE_TAP_MS = 400
const DOUBLE_TAP_PX = 30

const RAY_STYLE: Record<RayKind, { color: string; label: string; dashed?: boolean }> = {
  sunrise: { color: '#f0a202', label: 'Sunrise' },
  sunset: { color: '#e2522b', label: 'Sunset' },
  sun: { color: '#ffd23f', label: 'Sun now' },
  'sun-below': { color: '#8b93b8', label: 'Sun now (below horizon)', dashed: true },
  moonrise: { color: '#7dd3fc', label: 'Moonrise' },
  moonset: { color: '#a78bfa', label: 'Moonset' },
  moon: { color: '#f1f5f9', label: 'Moon now' },
  'moon-below': { color: '#94a3b8', label: 'Moon now (below horizon)', dashed: true },
}

const kindExpr: ExpressionSpecification = ['get', 'kind']
const colorExpr = [
  'match',
  kindExpr,
  ...Object.entries(RAY_STYLE).flatMap(([kind, style]) => [kind, style.color]),
  '#ffffff',
] as unknown as ExpressionSpecification
const dashedKinds = Object.entries(RAY_STYLE)
  .filter(([, style]) => style.dashed)
  .map(([kind]) => kind)
const isRole = (role: 'ray' | 'path' | 'disc'): ExpressionSpecification => ['==', ['get', 'role'], role]
const solidRay: ExpressionSpecification = ['all', isRole('ray'), ['!', ['in', kindExpr, ['literal', dashedKinds]]]]
const dashedRay: ExpressionSpecification = ['all', isRole('ray'), ['in', kindExpr, ['literal', dashedKinds]]]

function addLayers(map: MapLibre) {
  const firstSymbol = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
  map.addSource('terrain', {
    type: 'raster-dem',
    tiles: [TERRAIN_TILES],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 14,
    attribution: '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a>',
  })
  map.addLayer(
    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'terrain',
      paint: {
        'hillshade-exaggeration': 0.35,
        'hillshade-shadow-color': '#000000',
        'hillshade-highlight-color': '#5b6378',
        'hillshade-accent-color': '#000000',
      },
    },
    firstSymbol,
  )
  map.addSource('imagery', {
    type: 'raster',
    tiles: [IMAGERY],
    tileSize: 256,
    maxzoom: 19,
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  })
  map.addLayer({ id: 'imagery', type: 'raster', source: 'imagery', layout: { visibility: 'none' } }, firstSymbol)

  map.addSource('rays', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'sky-path',
    type: 'line',
    source: 'rays',
    filter: isRole('path'),
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.9 },
  })
  map.addLayer({
    id: 'rays-casing',
    type: 'line',
    source: 'rays',
    filter: solidRay,
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': '#05060c', 'line-width': 6, 'line-opacity': 0.8 },
  })
  map.addLayer({
    id: 'rays',
    type: 'line',
    source: 'rays',
    filter: solidRay,
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': colorExpr, 'line-width': 3.2 },
  })
  map.addLayer({
    id: 'rays-dashed',
    type: 'line',
    source: 'rays',
    filter: dashedRay,
    paint: { 'line-color': colorExpr, 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.9 },
  })
  map.addLayer({
    id: 'sky-disc',
    type: 'circle',
    source: 'rays',
    filter: ['all', isRole('disc'), ['==', ['geometry-type'], 'Point']],
    paint: {
      'circle-radius': 10,
      'circle-color': ['get', 'color'],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
      'circle-stroke-opacity': 0.85,
    },
  })
}

/** Radius of the sky drawing (the horizon) in metres: a fixed share of the map's smaller side. */
function skyRadius(map: MapLibre, lat: number): number {
  const canvas = map.getCanvas()
  return 0.42 * Math.min(canvas.clientWidth, canvas.clientHeight) * metersPerPixel(lat, map.getZoom())
}

export function MapPage() {
  const { selectedDate, selectedDayStart, timeZone, isToday, goToPreviousDay, goToNextDay, goToToday, goToDate } =
    useSelectedDate()
  const latitude = useLocationStore((s) => s.latitude)
  const longitude = useLocationStore((s) => s.longitude)
  const name = useLocationStore((s) => s.name)
  const setLocation = useLocationStore((s) => s.setLocation)
  const setGpsEnabled = useLocationStore((s) => s.setGpsEnabled)
  const setGpsStatus = useLocationStore((s) => s.setGpsStatus)
  const { timeFormat } = useSettingsStore()

  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const pinRef = useRef<Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [satellite, setSatellite] = useState(false)
  const [zoomTick, setZoomTick] = useState(0)
  const [bodies, setBodies] = useState<Bodies>('sun')
  const { horizon, loading: horizonLoading } = useHorizon(latitude, longitude)

  const moveSpot = (lat: number, lng: number, placeName?: string | null, placeZone?: string | null) => {
    setGpsEnabled(false)
    setGpsStatus('idle')
    setLocation(lat, lng, placeName ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`, placeZone ?? null)
  }
  const moveSpotRef = useRef(moveSpot)
  useEffect(() => {
    moveSpotRef.current = moveSpot
  })

  // Create the map once.
  useEffect(() => {
    if (!container.current) return
    const map = new MapLibre({
      container: container.current,
      style: STYLE,
      center: [longitude, latitude],
      zoom: START_ZOOM,
      attributionControl: false,
      doubleClickZoom: false, // a double click / double tap sets the spot
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
    })
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right')
    mapRef.current = map

    const pinElement = document.createElement('div')
    pinElement.className = 'h-5 w-5 rounded-full border-[3px] border-red-500 shadow-[0_0_0_2px_rgba(255,255,255,0.7)]'
    pinElement.setAttribute('aria-label', 'Selected spot')
    const pin = new Marker({ element: pinElement, draggable: true }).setLngLat([longitude, latitude]).addTo(map)
    pin.on('dragend', () => {
      const { lat, lng } = pin.getLngLat()
      moveSpotRef.current(lat, lng)
    })
    pinRef.current = pin

    // Double tap / double click sets the spot. MapLibre's own dblclick event is mouse-only, so
    // pair up clicks instead (mobile browsers send a click for each tap).
    let lastClick: { time: number; x: number; y: number } | null = null
    map.on('click', (event) => {
      const now = performance.now()
      const { x, y } = event.point
      if (lastClick && now - lastClick.time < DOUBLE_TAP_MS && Math.hypot(x - lastClick.x, y - lastClick.y) < DOUBLE_TAP_PX) {
        lastClick = null
        moveSpotRef.current(event.lngLat.lat, event.lngLat.lng)
      } else {
        lastClick = { time: now, x, y }
      }
    })
    map.on('zoomend', () => setZoomTick((tick) => tick + 1))
    map.on('load', () => {
      addLayers(map)
      // The compact attribution starts expanded and covers the map on phones; keep the (i) button.
      container.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
      pinRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; location changes are handled below
  }, [])

  // Follow location changes (search, saved places, drag).
  useEffect(() => {
    const map = mapRef.current
    pinRef.current?.setLngLat([longitude, latitude])
    if (map) {
      const center = map.getCenter()
      const far = Math.abs(center.lat - latitude) > 0.02 || Math.abs(center.lng - longitude) > 0.02
      if (far) map.easeTo({ center: [longitude, latitude], duration: 600 })
    }
  }, [latitude, longitude])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.setLayoutProperty('imagery', 'visibility', satellite ? 'visible' : 'none')
  }, [satellite, ready])

  const sunTimes = useMemo(
    () => getSunTimes(selectedDate, latitude, longitude, timeZone),
    [selectedDate, latitude, longitude, timeZone],
  )
  const moonData = useMemo(
    () => getMoonData(selectedDate, latitude, longitude, timeZone),
    [selectedDate, latitude, longitude, timeZone],
  )

  const rays = useMemo<Ray[]>(() => {
    const out: Ray[] = []
    const ray = (kind: RayKind, body: 'sun' | 'moon', time: Date): Ray => ({
      kind,
      time,
      azimuth: bodyPosition(body, time, latitude, longitude).azimuth,
    })
    if (sunTimes.sunrise) out.push(ray('sunrise', 'sun', sunTimes.sunrise))
    if (sunTimes.sunset) out.push(ray('sunset', 'sun', sunTimes.sunset))
    if (isToday) {
      const sun = bodyPosition('sun', selectedDate, latitude, longitude)
      const up = skyPosition('sun', selectedDate, latitude, longitude).up
      out.push({ kind: up ? 'sun' : 'sun-below', time: selectedDate, ...sun })
    }
    if (moonData.moonrise) out.push(ray('moonrise', 'moon', moonData.moonrise))
    if (moonData.moonset) out.push(ray('moonset', 'moon', moonData.moonset))
    if (isToday) {
      const moon = bodyPosition('moon', selectedDate, latitude, longitude)
      const up = skyPosition('moon', selectedDate, latitude, longitude).up
      out.push({ kind: up ? 'moon' : 'moon-below', time: selectedDate, ...moon })
    }
    return out
  }, [sunTimes, moonData, isToday, selectedDate, latitude, longitude])

  // The shown body's path across the sky over the selected local day.
  const path = useMemo(
    () => skyPath(bodies, selectedDayStart, addLocalDays(selectedDayStart, 1, timeZone), latitude, longitude),
    [bodies, selectedDayStart, timeZone, latitude, longitude],
  )

  const sunRays = rays.filter((ray) => !isMoonRay(ray))
  const moonRays = rays.filter(isMoonRay)

  // Draw the sky seen from above: the horizon is a circle around the spot (its radius follows
  // the zoom), a point at altitude h sits at radius × cos h. Rise/set lines end on the horizon;
  // the "now" line ends at the body's disc on today's path.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const radius = skyRadius(map, latitude)
    const at = (azimuth: number, altitude: number) => destination(latitude, longitude, azimuth, skyDistance(altitude, radius))
    const features: Feature[] = path.map((run) => ({
      type: 'Feature',
      properties: { role: 'path', color: PATH_COLOR[bodies] },
      geometry: { type: 'LineString', coordinates: run.map((point) => at(point.azimuth, point.altitude)) },
    }))
    for (const ray of rays.filter((r) => (bodies === 'moon') === isMoonRay(r))) {
      let length = radius
      if (ray.kind === 'sun' || ray.kind === 'moon') {
        const sky = skyPosition(bodies, ray.time, latitude, longitude)
        length = skyDistance(sky.altitude, radius)
        features.push({
          type: 'Feature',
          properties: { role: 'disc', color: DISC_COLOR[bodies] },
          geometry: { type: 'Point', coordinates: at(sky.azimuth, sky.altitude) },
        })
      }
      features.push({
        type: 'Feature',
        properties: { role: 'ray', kind: ray.kind },
        geometry: { type: 'LineString', coordinates: bearingLine(latitude, longitude, ray.azimuth, length) },
      })
    }
    const source = map.getSource('rays') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features })
  }, [rays, path, bodies, ready, latitude, longitude, zoomTick])

  const detail = (ray: Ray) =>
    isNowRay(ray) ? `Altitude ${ray.altitude!.toFixed(1)}°` : formatTime(ray.time, timeFormat, timeZone)

  const rayRows = (list: Ray[]) =>
    list.map((ray) => (
      <div key={ray.kind} className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={cn('w-5', RAY_STYLE[ray.kind].dashed ? 'h-0 border-t-2 border-dashed' : 'h-1 rounded-full')}
            style={RAY_STYLE[ray.kind].dashed ? { borderColor: RAY_STYLE[ray.kind].color } : { backgroundColor: RAY_STYLE[ray.kind].color }}
          />
          <div>
            <p className="text-xs text-foreground">{RAY_STYLE[ray.kind].label}</p>
            <p className="text-xs tabular-nums text-muted-foreground">{detail(ray)}</p>
          </div>
        </div>
        <p className="text-right text-sm font-medium tabular-nums text-foreground/90">
          {Math.round(ray.azimuth)}° {compass(ray.azimuth)}
        </p>
      </div>
    ))

  const terrainSection = (body: 'sun' | 'moon') => (
    <div className="mt-2 border-t border-white/[0.06] pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Mountain className="h-3.5 w-3.5" aria-hidden="true" />
        Over the real horizon
      </p>
      <TerrainRows
        horizon={horizon}
        loading={horizonLoading}
        dayStart={selectedDayStart}
        sunTimes={sunTimes}
        timeZone={timeZone}
        bodies={[body]}
      />
    </div>
  )

  const polarLabel = getPolarLabel(sunTimes.polar)

  return (
    <div className="space-y-5">
      <div className="animate-in-1">
        <SectionHeader
          title="Map"
          description={name ? `Directions from ${name}` : 'Directions from your spot'}
          icon={<MapIcon className="h-4 w-4" />}
          action={
            <DateNavigator
              date={selectedDate}
              timeZone={timeZone}
              isToday={isToday}
              onPrevious={goToPreviousDay}
              onNext={goToNextDay}
              onToday={goToToday}
              onDateSelect={goToDate}
            />
          }
        />
      </div>

      <div className="animate-in-2 space-y-3">
        <PlaceSearch
          onSelect={(place) => moveSpot(place.latitude, place.longitude, place.name, place.timeZone)}
          placeholder="Search a town or place to plan"
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08]">
          <div ref={container} className="h-[58vh] min-h-[320px] w-full" />
          <button
            type="button"
            onClick={() => setSatellite((value) => !value)}
            aria-pressed={satellite}
            className={cn(
              'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium backdrop-blur',
              satellite
                ? 'border-white/30 bg-white/20 text-white'
                : 'border-white/[0.12] bg-background/70 text-foreground',
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Satellite
          </button>
        </div>
        <div role="group" aria-label="Show directions for" className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.04] p-1">
          {BODY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBodies(option.value)}
              aria-pressed={bodies === option.value}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                bodies === option.value ? 'bg-white/[0.12] text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Double-tap the map or drag the pin to plan from another spot.
        </p>
      </div>

      {bodies === 'sun' && (
        <section className="animate-in-3 space-y-3" aria-label="Sun directions">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sun/8">
              <Sun className="h-3.5 w-3.5 text-sun" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Sun</span>
          </div>
          <div className="surface space-y-0">
            {rayRows(sunRays)}
            {polarLabel && <p className="py-2 text-xs text-muted-foreground">{polarLabel}</p>}
            {terrainSection('sun')}
          </div>
        </section>
      )}

      {bodies === 'moon' && (
        <section className="animate-in-3 space-y-3" aria-label="Moon directions">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-moon/8">
              <Moon className="h-3.5 w-3.5 text-moon" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Moon</span>
          </div>
          <div className="surface space-y-0">
            {rayRows(moonRays)}
            {!moonData.moonrise && !moonData.moonset && (
              <p className="py-2 text-xs text-muted-foreground">No moonrise or moonset this day.</p>
            )}
            {terrainSection('moon')}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        {horizon ? `Ground ${Math.round(horizon.elevation)} m · ` : ''}terrain from open elevation data; trees and
        buildings are not included.
      </p>
    </div>
  )
}

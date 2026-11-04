import { useEffect, useMemo, useRef, useState } from 'react'
import { AttributionControl, Map as MapLibre, Marker, setWorkerUrl } from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Layers, Map as MapIcon } from 'lucide-react'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { DateNavigator } from '@/components/shared/DateNavigator'
import { PlaceSearch } from '@/components/shared/PlaceSearch'
import { TerrainCard } from '@/features/terrain/TerrainCard'
import { useSelectedDate } from '@/hooks/useSelectedDate'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { getSunTimes } from '@/lib/astronomy/sun-calculator'
import { getMoonData } from '@/lib/astronomy/moon-calculator'
import { findDateForSolarLongitude } from '@/lib/astronomy/solar-longitude'
import { bodyPosition } from '@/lib/terrain/horizon'
import { TERRAIN_TILES } from '@/lib/terrain/terrain'
import { bearingLine, compass, metersPerPixel } from '@/lib/geo/bearing'
import { formatTime } from '@/lib/formatting'
import { cn } from '@/lib/utils'
import { TZDate } from '@date-fns/tz'

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
  | 'summer-rise'
  | 'summer-set'
  | 'winter-rise'
  | 'winter-set'

interface Ray {
  kind: RayKind
  azimuth: number
}

const RAY_STYLE: Record<RayKind, { color: string; label: string; dashed?: boolean }> = {
  sunrise: { color: '#f0a202', label: 'Sunrise' },
  sunset: { color: '#e2522b', label: 'Sunset' },
  sun: { color: '#ffd23f', label: 'Sun now' },
  'sun-below': { color: '#8b93b8', label: 'Sun now (below horizon)', dashed: true },
  moonrise: { color: '#c7d2fe', label: 'Moonrise' },
  moonset: { color: '#8ea3c7', label: 'Moonset' },
  moon: { color: '#f1f5f9', label: 'Moon now' },
  'moon-below': { color: '#64748b', label: 'Moon now (below horizon)', dashed: true },
  'summer-rise': { color: '#e0892b', label: 'June solstice', dashed: true },
  'summer-set': { color: '#e0892b', label: 'June solstice', dashed: true },
  'winter-rise': { color: '#5b8fd0', label: 'December solstice', dashed: true },
  'winter-set': { color: '#5b8fd0', label: 'December solstice', dashed: true },
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
    id: 'rays-casing',
    type: 'line',
    source: 'rays',
    filter: ['!', ['in', kindExpr, ['literal', dashedKinds]]],
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': '#05060c', 'line-width': 6, 'line-opacity': 0.8 },
  })
  map.addLayer({
    id: 'rays',
    type: 'line',
    source: 'rays',
    filter: ['!', ['in', kindExpr, ['literal', dashedKinds]]],
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': colorExpr, 'line-width': 3.2 },
  })
  map.addLayer({
    id: 'rays-dashed',
    type: 'line',
    source: 'rays',
    filter: ['in', kindExpr, ['literal', dashedKinds]],
    paint: { 'line-color': colorExpr, 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.9 },
  })
}

function rayLength(map: MapLibre, lat: number): number {
  const canvas = map.getCanvas()
  const diagonal = Math.hypot(canvas.clientWidth, canvas.clientHeight)
  return Math.max(2_000, Math.min(400_000, diagonal * 0.6 * metersPerPixel(lat, map.getZoom())))
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
    pinElement.className = 'h-4 w-4 rounded-full border-2 border-white bg-proximity shadow-[0_0_0_4px_rgba(0,0,0,0.35)]'
    pinElement.setAttribute('aria-label', 'Selected spot')
    const pin = new Marker({ element: pinElement, draggable: true }).setLngLat([longitude, latitude]).addTo(map)
    pin.on('dragend', () => {
      const { lat, lng } = pin.getLngLat()
      moveSpotRef.current(lat, lng)
    })
    pinRef.current = pin

    map.on('dblclick', (event) => moveSpotRef.current(event.lngLat.lat, event.lngLat.lng))
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
    const az = (body: 'sun' | 'moon', at: Date) => bodyPosition(body, at, latitude, longitude).azimuth
    if (sunTimes.sunrise) out.push({ kind: 'sunrise', azimuth: az('sun', sunTimes.sunrise) })
    if (sunTimes.sunset) out.push({ kind: 'sunset', azimuth: az('sun', sunTimes.sunset) })
    if (moonData.moonrise) out.push({ kind: 'moonrise', azimuth: az('moon', moonData.moonrise) })
    if (moonData.moonset) out.push({ kind: 'moonset', azimuth: az('moon', moonData.moonset) })
    if (isToday) {
      const sun = bodyPosition('sun', selectedDate, latitude, longitude)
      out.push({ kind: sun.altitude > -0.833 ? 'sun' : 'sun-below', azimuth: sun.azimuth })
      const moon = bodyPosition('moon', selectedDate, latitude, longitude)
      out.push({ kind: moon.altitude > 0 ? 'moon' : 'moon-below', azimuth: moon.azimuth })
    }
    const year = new TZDate(selectedDayStart.getTime(), timeZone).getFullYear()
    for (const [season, longitudeDeg] of [['summer', 90], ['winter', 270]] as const) {
      const day = findDateForSolarLongitude(longitudeDeg, year)
      const times = getSunTimes(day, latitude, longitude, timeZone)
      if (times.sunrise) out.push({ kind: `${season}-rise`, azimuth: az('sun', times.sunrise) })
      if (times.sunset) out.push({ kind: `${season}-set`, azimuth: az('sun', times.sunset) })
    }
    return out
  }, [sunTimes, moonData, isToday, selectedDate, selectedDayStart, latitude, longitude, timeZone])

  // Draw the rays; their length follows the zoom level.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const length = rayLength(map, latitude)
    const source = map.getSource('rays') as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: rays.map((ray) => ({
        type: 'Feature',
        properties: { kind: ray.kind },
        geometry: { type: 'LineString', coordinates: bearingLine(latitude, longitude, ray.azimuth, length) },
      })),
    })
  }, [rays, ready, latitude, longitude, zoomTick])

  const events: Array<{ kind: RayKind; time: Date | null; azimuth: number | null }> = [
    { kind: 'sunrise', time: sunTimes.sunrise, azimuth: rays.find((r) => r.kind === 'sunrise')?.azimuth ?? null },
    { kind: 'sunset', time: sunTimes.sunset, azimuth: rays.find((r) => r.kind === 'sunset')?.azimuth ?? null },
    { kind: 'moonrise', time: moonData.moonrise, azimuth: rays.find((r) => r.kind === 'moonrise')?.azimuth ?? null },
    { kind: 'moonset', time: moonData.moonset, azimuth: rays.find((r) => r.kind === 'moonset')?.azimuth ?? null },
  ]

  return (
    <div className="space-y-5">
      <div className="animate-in-1">
        <SectionHeader
          title="Map"
          description={name ? `Directions from ${name}` : 'Sun & moon directions'}
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
        <p className="text-xs text-muted-foreground">
          Double-tap the map or drag the pin to plan from another spot.
        </p>
      </div>

      <div className="animate-in-3 surface space-y-0">
        {events.map(({ kind, time, azimuth }) => (
          <div key={kind} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-1 w-5 rounded-full"
                style={{ backgroundColor: RAY_STYLE[kind].color }}
              />
              <p className="text-xs text-muted-foreground">{RAY_STYLE[kind].label}</p>
            </div>
            <p className="text-right text-sm font-medium tabular-nums text-foreground/90">
              {formatTime(time, timeFormat, timeZone)}
              {azimuth !== null && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {Math.round(azimuth)}° {compass(azimuth)}
                </span>
              )}
            </p>
          </div>
        ))}
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: RAY_STYLE['summer-rise'].color }} />
            June solstice
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed" style={{ borderColor: RAY_STYLE['winter-rise'].color }} />
            December solstice
          </span>
          {isToday && (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-1 w-5 rounded-full" style={{ backgroundColor: RAY_STYLE.sun.color }} />
              Sun / moon now
            </span>
          )}
        </div>
      </div>

      <div className="animate-in-4">
        <TerrainCard
          latitude={latitude}
          longitude={longitude}
          dayStart={selectedDayStart}
          sunTimes={sunTimes}
          timeZone={timeZone}
        />
      </div>
    </div>
  )
}

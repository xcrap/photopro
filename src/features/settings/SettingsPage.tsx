import { useState } from 'react'
import {
  MapPin,
  Clock,
  Palette,
  Calendar,
  Navigation,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { useLocationStore } from '@/stores/location-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useGeolocation } from '@/hooks/useGeolocation'
import type { TimeFormat, ThemeMode } from '@/types'

function normalizeCoordinateInput(value: string): string {
  const compact = value.replace(/\s+/g, '').replace(/,/g, '.')

  let result = ''
  let hasDot = false

  for (const ch of compact) {
    if (ch >= '0' && ch <= '9') {
      result += ch
      continue
    }

    if (ch === '-' && result.length === 0) {
      result += ch
      continue
    }

    if (ch === '.' && !hasDot) {
      if (result === '' || result === '-') {
        result += '0'
      }
      result += '.'
      hasDot = true
    }
  }

  return result
}

function parseCoordinate(value: string): number {
  return Number(normalizeCoordinateInput(value))
}

function formatCoordinateIfValid(
  value: string,
  setValue: (next: string) => void,
): void {
  if (value === '' || value === '-' || value === '.' || value === '-.') return
  const parsed = parseCoordinate(value)
  if (!Number.isFinite(parsed)) return
  setValue(parsed.toFixed(6))
}

export function SettingsPage() {
  const {
    latitude,
    longitude,
    name,
    gpsEnabled,
    gpsStatus,
    savedLocations,
    setLocation,
    setGpsEnabled,
    setGpsStatus,
    addSavedLocation,
    updateSavedLocation,
    removeSavedLocation,
  } = useLocationStore()
  const {
    timeFormat,
    theme,
    eclipseYearsRange,
    setTimeFormat,
    setTheme,
    setEclipseYearsRange,
  } = useSettingsStore()
  const { requestLocation } = useGeolocation({ autoRequest: false })

  const [manualLat, setManualLat] = useState(latitude.toString())
  const [manualLon, setManualLon] = useState(longitude.toString())
  const [manualError, setManualError] = useState<string | null>(null)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formLat, setFormLat] = useState('')
  const [formLon, setFormLon] = useState('')
  const [dialogError, setDialogError] = useState<string | null>(null)

  const handleGpsToggle = (enabled: boolean) => {
    setGpsEnabled(enabled)
    if (!enabled) setGpsStatus('idle')
    if (enabled) requestLocation()
  }

  const handleManualSubmit = () => {
    const lat = parseCoordinate(manualLat)
    const lon = parseCoordinate(manualLon)
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setManualError('Enter valid coordinates (lat -90..90, lon -180..180).')
      return
    }

    setGpsEnabled(false)
    setGpsStatus('idle')
    setLocation(lat, lon, `${lat.toFixed(4)}, ${lon.toFixed(4)}`)
    setManualLat(lat.toFixed(4))
    setManualLon(lon.toFixed(4))
    setManualError(null)
  }

  const handleSelectSaved = (id: string) => {
    const loc = savedLocations.find((l) => l.id === id)
    if (loc) {
      setGpsEnabled(false)
      setGpsStatus('idle')
      setLocation(loc.latitude, loc.longitude, loc.name)
      setManualLat(loc.latitude.toString())
      setManualLon(loc.longitude.toString())
      setManualError(null)
    }
  }

  const openAddDialog = () => {
    setEditingId(null)
    setFormName('')
    setFormLat('')
    setFormLon('')
    setDialogError(null)
    setDialogOpen(true)
  }

  const openAddCurrentDialog = () => {
    setEditingId(null)
    setFormName(name || '')
    setFormLat(latitude.toFixed(4))
    setFormLon(longitude.toFixed(4))
    setDialogError(null)
    setDialogOpen(true)
  }

  const openEditDialog = (id: string) => {
    const loc = savedLocations.find((l) => l.id === id)
    if (loc) {
      setEditingId(id)
      setFormName(loc.name)
      setFormLat(loc.latitude.toString())
      setFormLon(loc.longitude.toString())
      setDialogError(null)
      setDialogOpen(true)
    }
  }

  const handleDialogSave = () => {
    const lat = parseCoordinate(formLat)
    const lon = parseCoordinate(formLon)
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setDialogError('Enter valid coordinates (lat -90..90, lon -180..180).')
      return
    }

    const safeName = formName.trim() || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    if (editingId) {
      updateSavedLocation(editingId, { name: safeName, latitude: lat, longitude: lon })
    } else {
      addSavedLocation({ name: safeName, latitude: lat, longitude: lon })
    }
    setDialogError(null)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Settings"
        description="Location, display & data"
      />

      {/* Location */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Location</span>
        </div>
        <div className="surface space-y-3 p-5">
          {/* GPS Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Use GPS</p>
                <p className="text-xs text-muted-foreground/60">Auto-detect location</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="border-white/[0.06] bg-white/[0.03] text-xs font-normal">
                {gpsStatus}
              </Badge>
              <Switch checked={gpsEnabled} onCheckedChange={handleGpsToggle} />
            </div>
          </div>

          {/* Current Location */}
          <div className="rounded-xl bg-white/[0.03] p-3.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/40">Current</p>
            <p className="mt-1 text-sm font-medium">{name || 'Unknown'}</p>
            <p className="break-all text-xs tabular-nums text-muted-foreground/50">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          </div>

          {/* Manual Coordinates */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/40">Manual coordinates</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                type="text"
                inputMode="decimal"
                value={manualLat}
                onChange={(e) => setManualLat(normalizeCoordinateInput(e.target.value))}
                onBlur={() => formatCoordinateIfValid(manualLat, setManualLat)}
                placeholder="Latitude"
                className="h-9 w-full min-w-0 bg-white/[0.03] text-sm"
              />
              <Input
                type="text"
                inputMode="decimal"
                value={manualLon}
                onChange={(e) => setManualLon(normalizeCoordinateInput(e.target.value))}
                onBlur={() => formatCoordinateIfValid(manualLon, setManualLon)}
                placeholder="Longitude"
                className="h-9 w-full min-w-0 bg-white/[0.03] text-sm"
              />
            </div>
            <Button onClick={handleManualSubmit} size="sm" className="h-8 w-full text-xs">
              Update Location
            </Button>
            {manualError && (
              <p className="text-xs text-destructive">{manualError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Saved Locations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Saved Locations</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground/60 hover:text-foreground"
              onClick={openAddCurrentDialog}
            >
              <Navigation className="h-3 w-3" /> Save Current
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground/60 hover:text-foreground"
              onClick={openAddDialog}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </div>
        <div className="surface space-y-1.5 p-5">
          {savedLocations.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.02] py-8">
              <MapPin className="h-5 w-5 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground/40">
                No saved locations yet
              </p>
            </div>
          )}
          {savedLocations.map((loc) => (
            <div
              key={loc.id}
              className="group flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05]"
            >
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => handleSelectSaved(loc.id)}
              >
                <p className="truncate text-sm font-medium">{loc.name}</p>
                <p className="tabular-nums text-xs text-muted-foreground/50">
                  {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                </p>
              </button>
              <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
                  onClick={() => openEditDialog(loc.id)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
                  onClick={() => removeSavedLocation(loc.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Display */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
            <Palette className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Display</span>
        </div>
        <div className="surface space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Label className="text-sm">Time Format</Label>
            </div>
            <Select value={timeFormat} onValueChange={(v) => setTimeFormat(v as TimeFormat)}>
              <SelectTrigger className="h-8 w-[100px] bg-white/[0.03] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12 Hour</SelectItem>
                <SelectItem value="24h">24 Hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Label className="text-sm">Theme</Label>
            </div>
            <Select value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
              <SelectTrigger className="h-8 w-[100px] bg-white/[0.03] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Data Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
            <Calendar className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Data Range</span>
        </div>
        <div className="surface space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Eclipse Data</Label>
            <Badge variant="outline" className="border-white/[0.06] bg-white/[0.03] text-xs font-normal">
              {eclipseYearsRange} year{eclipseYearsRange > 1 ? 's' : ''}
            </Badge>
          </div>
          <Slider
            value={[eclipseYearsRange]}
            onValueChange={([v]) => setEclipseYearsRange(v)}
            min={1}
            max={5}
            step={1}
          />
          <div className="flex justify-between text-xs text-muted-foreground/40">
            <span>1 year</span>
            <span>5 years</span>
          </div>
        </div>
      </div>

      {/* Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="surface border-white/[0.06] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editingId ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              {editingId ? 'Update this saved location.' : 'Save a new location for quick access.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground/60">Name</Label>
              <Input
                placeholder="e.g. Home, Studio, Beach"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1.5 h-9 bg-white/[0.03] text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label className="text-xs text-muted-foreground/60">Latitude</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="37.8283"
                  value={formLat}
                  onChange={(e) => setFormLat(normalizeCoordinateInput(e.target.value))}
                  onBlur={() => formatCoordinateIfValid(formLat, setFormLat)}
                  className="mt-1.5 h-9 w-full min-w-0 bg-white/[0.03] text-sm"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-xs text-muted-foreground/60">Longitude</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="-25.5197"
                  value={formLon}
                  onChange={(e) => setFormLon(normalizeCoordinateInput(e.target.value))}
                  onBlur={() => formatCoordinateIfValid(formLon, setFormLon)}
                  className="mt-1.5 h-9 w-full min-w-0 bg-white/[0.03] text-sm"
                />
              </div>
            </div>
            {dialogError && (
              <p className="text-xs text-destructive">{dialogError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleDialogSave} className="text-xs">
              {editingId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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
import { Card, CardContent } from '@/components/ui/card'
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
  const { requestLocation } = useGeolocation()

  const [manualLat, setManualLat] = useState(latitude.toString())
  const [manualLon, setManualLon] = useState(longitude.toString())

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formLat, setFormLat] = useState('')
  const [formLon, setFormLon] = useState('')

  const handleGpsToggle = (enabled: boolean) => {
    setGpsEnabled(enabled)
    if (enabled) requestLocation()
  }

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat)
    const lon = parseFloat(manualLon)
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setLocation(lat, lon, `${lat.toFixed(4)}, ${lon.toFixed(4)}`)
    }
  }

  const handleSelectSaved = (id: string) => {
    const loc = savedLocations.find((l) => l.id === id)
    if (loc) {
      setLocation(loc.latitude, loc.longitude, loc.name)
      setManualLat(loc.latitude.toString())
      setManualLon(loc.longitude.toString())
    }
  }

  const openAddDialog = () => {
    setEditingId(null)
    setFormName('')
    setFormLat('')
    setFormLon('')
    setDialogOpen(true)
  }

  const openAddCurrentDialog = () => {
    setEditingId(null)
    setFormName(name || '')
    setFormLat(latitude.toFixed(4))
    setFormLon(longitude.toFixed(4))
    setDialogOpen(true)
  }

  const openEditDialog = (id: string) => {
    const loc = savedLocations.find((l) => l.id === id)
    if (loc) {
      setEditingId(id)
      setFormName(loc.name)
      setFormLat(loc.latitude.toString())
      setFormLon(loc.longitude.toString())
      setDialogOpen(true)
    }
  }

  const handleDialogSave = () => {
    const lat = parseFloat(formLat)
    const lon = parseFloat(formLon)
    if (!formName.trim() || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return
    if (editingId) {
      updateSavedLocation(editingId, { name: formName.trim(), latitude: lat, longitude: lon })
    } else {
      addSavedLocation({ name: formName.trim(), latitude: lat, longitude: lon })
    }
    setDialogOpen(false)
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Settings"
        description="Location, display & data"
      />

      {/* Location */}
      <Card className="surface overflow-hidden border-0">
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <MapPin className="h-4 w-4 text-primary/70" />
          <span className="text-[13px] font-semibold">Location</span>
        </div>
        <CardContent className="space-y-5 px-5 pt-0 pb-5">
          {/* GPS Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Use GPS</p>
                <p className="text-[11px] text-muted-foreground/60">Auto-detect location</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Badge variant="outline" className="border-white/[0.06] bg-white/[0.03] text-[10px] font-normal">
                {gpsStatus}
              </Badge>
              <Switch checked={gpsEnabled} onCheckedChange={handleGpsToggle} />
            </div>
          </div>

          {/* Current Location */}
          <div className="rounded-xl bg-white/[0.03] p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">Current</p>
            <p className="mt-1 text-[14px] font-medium">{name || 'Unknown'}</p>
            <p className="text-[11px] tabular-nums text-muted-foreground/50">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          </div>

          {/* Manual Coordinates */}
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">Manual coordinates</p>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.0001"
                min={-90}
                max={90}
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="Latitude"
                className="h-9 bg-white/[0.03] text-[13px]"
              />
              <Input
                type="number"
                step="0.0001"
                min={-180}
                max={180}
                value={manualLon}
                onChange={(e) => setManualLon(e.target.value)}
                placeholder="Longitude"
                className="h-9 bg-white/[0.03] text-[13px]"
              />
            </div>
            <Button onClick={handleManualSubmit} size="sm" className="h-8 w-full text-[12px]">
              Update Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Locations */}
      <Card className="surface overflow-hidden border-0">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary/70" />
            <span className="text-[13px] font-semibold">Saved Locations</span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground/60 hover:text-foreground"
              onClick={openAddCurrentDialog}
            >
              <Navigation className="h-3 w-3" /> Save Current
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground/60 hover:text-foreground"
              onClick={openAddDialog}
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>
        </div>
        <CardContent className="space-y-1.5 px-5 pt-0 pb-5">
          {savedLocations.length === 0 && (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.02] py-8">
              <MapPin className="h-5 w-5 text-muted-foreground/30" />
              <p className="text-[12px] text-muted-foreground/40">
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
                <p className="truncate text-[13px] font-medium">{loc.name}</p>
                <p className="tabular-nums text-[11px] text-muted-foreground/50">
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
        </CardContent>
      </Card>

      {/* Display */}
      <Card className="surface overflow-hidden border-0">
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <Palette className="h-4 w-4 text-primary/70" />
          <span className="text-[13px] font-semibold">Display</span>
        </div>
        <CardContent className="space-y-4 px-5 pt-0 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Label className="text-[13px]">Time Format</Label>
            </div>
            <Select value={timeFormat} onValueChange={(v) => setTimeFormat(v as TimeFormat)}>
              <SelectTrigger className="h-8 w-[100px] bg-white/[0.03] text-[12px]">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <Label className="text-[13px]">Theme</Label>
            </div>
            <Select value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
              <SelectTrigger className="h-8 w-[100px] bg-white/[0.03] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Range */}
      <Card className="surface overflow-hidden border-0">
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <Calendar className="h-4 w-4 text-primary/70" />
          <span className="text-[13px] font-semibold">Data Range</span>
        </div>
        <CardContent className="space-y-3 px-5 pt-0 pb-5">
          <div className="flex items-center justify-between">
            <Label className="text-[13px]">Eclipse Data</Label>
            <Badge variant="outline" className="border-white/[0.06] bg-white/[0.03] text-[10px] font-normal">
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
          <div className="flex justify-between text-[11px] text-muted-foreground/40">
            <span>1 year</span>
            <span>5 years</span>
          </div>
        </CardContent>
      </Card>

      {/* Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="surface border-white/[0.06] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              {editingId ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-muted-foreground/60">
              {editingId ? 'Update this saved location.' : 'Save a new location for quick access.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-[12px] text-muted-foreground/60">Name</Label>
              <Input
                placeholder="e.g. Home, Studio, Beach"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1.5 h-9 bg-white/[0.03] text-[13px]"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-[12px] text-muted-foreground/60">Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  placeholder="37.8283"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  className="mt-1.5 h-9 bg-white/[0.03] text-[13px]"
                />
              </div>
              <div className="flex-1">
                <Label className="text-[12px] text-muted-foreground/60">Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  placeholder="-25.5197"
                  value={formLon}
                  onChange={(e) => setFormLon(e.target.value)}
                  className="mt-1.5 h-9 bg-white/[0.03] text-[13px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="text-[12px]">
              Cancel
            </Button>
            <Button size="sm" onClick={handleDialogSave} className="text-[12px]">
              {editingId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

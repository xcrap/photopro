import { useState } from 'react'
import {
  Settings,
  MapPin,
  Clock,
  Palette,
  Calendar,
  Navigation,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
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

  // Saved location form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formLat, setFormLat] = useState('')
  const [formLon, setFormLon] = useState('')

  const handleGpsToggle = (enabled: boolean) => {
    setGpsEnabled(enabled)
    if (enabled) {
      requestLocation()
    }
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

  const resetForm = () => {
    setFormName('')
    setFormLat('')
    setFormLon('')
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleAddSave = () => {
    const lat = parseFloat(formLat)
    const lon = parseFloat(formLon)
    if (!formName.trim() || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return
    addSavedLocation({ name: formName.trim(), latitude: lat, longitude: lon })
    resetForm()
  }

  const handleEditStart = (id: string) => {
    const loc = savedLocations.find((l) => l.id === id)
    if (loc) {
      setEditingId(id)
      setFormName(loc.name)
      setFormLat(loc.latitude.toString())
      setFormLon(loc.longitude.toString())
    }
  }

  const handleEditSave = () => {
    if (!editingId) return
    const lat = parseFloat(formLat)
    const lon = parseFloat(formLon)
    if (!formName.trim() || isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return
    updateSavedLocation(editingId, { name: formName.trim(), latitude: lat, longitude: lon })
    resetForm()
  }

  const handleAddCurrentLocation = () => {
    setFormName(name || '')
    setFormLat(latitude.toFixed(4))
    setFormLon(longitude.toFixed(4))
    setShowAddForm(true)
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        description="Location, display & data preferences"
        icon={<Settings className="h-4 w-4" />}
      />

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* GPS Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Use GPS</Label>
                <p className="text-xs text-muted-foreground">
                  Auto-detect your location
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {gpsStatus}
              </Badge>
              <Switch checked={gpsEnabled} onCheckedChange={handleGpsToggle} />
            </div>
          </div>

          <Separator className="opacity-30" />

          {/* Current Location */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Current Location</p>
            <p className="text-sm font-medium">{name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </p>
          </div>

          <Separator className="opacity-30" />

          {/* Manual Coordinates */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Manual Coordinates</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Latitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="40.7128"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Longitude</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  placeholder="-74.0060"
                />
              </div>
            </div>
            <Button onClick={handleManualSubmit} size="sm" className="w-full">
              Update Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Locations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Saved Locations
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={handleAddCurrentLocation}
              >
                <Navigation className="h-3 w-3" /> Save Current
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => { resetForm(); setShowAddForm(true) }}
              >
                <Plus className="h-3 w-3" /> Add
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Add / Edit Form */}
          {(showAddForm || editingId) && (
            <div className="space-y-2 rounded-lg border border-primary/20 bg-muted/20 p-3">
              <Label className="text-xs text-muted-foreground">
                {editingId ? 'Edit Location' : 'New Location'}
              </Label>
              <Input
                placeholder="Location name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.0001"
                  min={-90}
                  max={90}
                  placeholder="Latitude"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  step="0.0001"
                  min={-180}
                  max={180}
                  placeholder="Longitude"
                  value={formLon}
                  onChange={(e) => setFormLon(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1 gap-1 text-xs"
                  onClick={editingId ? handleEditSave : handleAddSave}
                >
                  <Check className="h-3 w-3" /> Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={resetForm}
                >
                  <X className="h-3 w-3" /> Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Location list */}
          {savedLocations.length === 0 && !showAddForm && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No saved locations yet. Add one to quickly switch between locations.
            </p>
          )}
          {savedLocations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
            >
              <button
                className="flex-1 text-left"
                onClick={() => handleSelectSaved(loc.id)}
              >
                <p className="text-sm font-medium">{loc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                </p>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => handleEditStart(loc.id)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => removeSavedLocation(loc.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4 text-primary" />
            Display
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Time Format */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label>Time Format</Label>
            </div>
            <Select
              value={timeFormat}
              onValueChange={(v) => setTimeFormat(v as TimeFormat)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12 Hour</SelectItem>
                <SelectItem value="24h">24 Hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="opacity-30" />

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <Label>Theme</Label>
            </div>
            <Select
              value={theme}
              onValueChange={(v) => setTheme(v as ThemeMode)}
            >
              <SelectTrigger className="w-[120px]">
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

      {/* Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="h-4 w-4 text-primary" />
            Data Range
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Eclipse Data Range</Label>
              <Badge variant="outline">{eclipseYearsRange} year{eclipseYearsRange > 1 ? 's' : ''}</Badge>
            </div>
            <Slider
              value={[eclipseYearsRange]}
              onValueChange={([v]) => setEclipseYearsRange(v)}
              min={1}
              max={5}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 year</span>
              <span>5 years</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

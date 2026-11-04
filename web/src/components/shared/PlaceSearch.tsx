import { useEffect, useId, useState } from 'react'
import { Loader2, MapPin, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { searchPlaces } from '@/lib/geo/search'
import type { PlaceResult } from '@/lib/geo/search'

interface PlaceSearchProps {
  onSelect: (place: PlaceResult) => void
  placeholder?: string
}

const DEBOUNCE_MS = 350

/** Search box for towns and places; picking a result calls `onSelect`. */
export function PlaceSearch({ onSelect, placeholder = 'Search a town or place' }: PlaceSearchProps) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      searchPlaces(query, controller.signal)
        .then((found) => {
          setResults(found)
          setLoading(false)
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setError(err instanceof Error ? err.message : 'Place search failed')
          setLoading(false)
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const select = (place: PlaceResult) => {
    onSelect(place)
    setQuery('')
    setResults([])
  }

  const showResults = query.trim().length >= 2

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim().length < 2) setResults([])
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault()
              select(results[0])
            }
          }}
          placeholder={placeholder}
          aria-label="Search places"
          aria-controls={listId}
          className="h-9 w-full bg-white/[0.03] pl-8 text-sm"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      {showResults && (
        <ul id={listId} className="overflow-hidden rounded-xl border border-white/[0.08] bg-background/95">
          {error && <li className="px-3 py-2 text-xs text-destructive">{error}</li>}
          {!error && !loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">No places found</li>
          )}
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => select(place)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate text-sm">{place.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{place.detail}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

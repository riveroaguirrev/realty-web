import { useEffect, useState } from 'react'
import type { MapboxPlace } from '@/utils/mapboxAddress'

export function CityAutocomplete({ value, onChange }: { value: string; onChange: (city: string) => void }) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  const [query, setQuery] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [places, setPlaces] = useState<MapboxPlace[]>([])
  const [active, setActive] = useState(-1)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setPlaces([])
    setActive(-1)
    setMessage('')
    setLoading(false)
    if (!token || !focused || query !== value || query.trim().length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ access_token: token, language: 'es', country: 'bo', types: 'place', autocomplete: 'true', limit: '5' })
        const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error()
        const data = await response.json() as { features: MapboxPlace[] }
        if (controller.signal.aborted) return
        setPlaces(data.features)
        if (!data.features.length) setMessage('No encontramos ciudades. Puedes escribir el nombre manualmente.')
      } catch {
        if (!controller.signal.aborted) setMessage('No pudimos cargar las sugerencias. Puedes escribir la ciudad manualmente.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 350)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [token, query, value, focused])

  const open = focused && query === value && (loading || places.length > 0 || Boolean(message))
  const choose = (place: MapboxPlace) => {
    setQuery(null)
    setPlaces([])
    setActive(-1)
    onChange(place.text || place.place_name.split(',')[0].trim())
  }

  return <div className="city-autocomplete">
    <label htmlFor="property-city" className="property-label">Ciudad *</label>
    <input id="property-city" name="city" className="property-control" value={value} required autoComplete="off" spellCheck={false} placeholder="Escribe para buscar una ciudad"
      role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="property-city-suggestions" aria-activedescendant={open && active >= 0 ? `property-city-option-${active}` : undefined}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onChange={event => { setQuery(event.target.value); setPlaces([]); setActive(-1); onChange(event.target.value) }}
      onKeyDown={event => {
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && places.length) {
          event.preventDefault()
          setActive(previous => event.key === 'ArrowDown' ? (previous + 1) % places.length : previous <= 0 ? places.length - 1 : previous - 1)
        } else if (event.key === 'Escape') { event.preventDefault(); setQuery(null); setActive(-1) }
        else if (event.key === 'Enter' && open) { event.preventDefault(); if (active >= 0) choose(places[active]) }
      }} />
    {open && <div className="city-suggestions">
      {loading && <p role="status">Buscando ciudades…</p>}
      {message && <p role="status">{message}</p>}
      <ul id="property-city-suggestions" role="listbox" aria-label="Ciudades sugeridas por Mapbox">
        {places.map((place, index) => <li key={place.id} id={`property-city-option-${index}`} role="option" aria-selected={active === index} onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(place)}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
          <span><strong>{place.text || place.place_name.split(',')[0]}</strong><small>{place.place_name}</small></span>
        </li>)}
      </ul>
      {places.length > 0 && <span className="city-suggestions-source">Sugerencias de Mapbox</span>}
    </div>}
  </div>
}

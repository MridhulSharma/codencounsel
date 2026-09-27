import { useEffect, useState } from 'react'
import { DEMO_PID, propertySource, type SearchProperty } from '../lib/data'
import { shortAddress } from '../lib/format'

export function Search({ onSelect, busy }: { onSelect: (pid: string) => void; busy: boolean }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchProperty[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [status, setStatus] = useState(
    'Search by street address or parcel ID. Allston / 02134 only.',
  )
  useEffect(() => {
    if (!query.trim()) return
    let cancelled = false
    const timer = setTimeout(() => {
      propertySource
        .searchProperties(query)
        .then((items) => {
          if (cancelled) return
          setResults(items)
          setStatus(
            items.length
              ? `${items.length} matches${items.length === 12 ? ' shown; refine your search for more specific results' : ''}. Use up and down arrows, then Enter.`
              : 'No matching address. Try a street name or parcel ID. This pilot only includes Allston / 02134.',
          )
        })
        .catch(() => {
          if (!cancelled) {
            setResults([])
            setStatus('Search data could not load. Edit your search to retry.')
          }
        })
    }, 150)
    return () => {
      clearTimeout(timer)
      cancelled = true
    }
  }, [query])
  const select = (p: SearchProperty) => {
    setOpen(false)
    setActive(-1)
    onSelect(p.pid)
  }
  return (
    <div className="search-box" id="search">
      <label htmlFor="address">Find your Allston property</label>
      <div className="search-control">
        <span aria-hidden="true">⌕</span>
        <input
          id="address"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls="address-results"
          aria-activedescendant={open && active >= 0 ? `result-${active}` : undefined}
          aria-describedby="search-status"
          autoComplete="off"
          placeholder="Street address or parcel ID"
          value={query}
          disabled={busy}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(-1)
            setResults([])
            setOpen(true)
            setStatus(e.target.value.trim() ? 'Searching…' : 'Enter an Allston address.')
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setActive(-1)
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setOpen(true)
              setActive((i) => Math.min(i + 1, results.length - 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setOpen(true)
              setActive((i) => Math.max(i - 1, 0))
            }
            if (e.key === 'Enter' && open && active >= 0 && results[active]) {
              e.preventDefault()
              select(results[active])
            }
          }}
        />
      </div>
      {open && results.length > 0 && (
        <ul id="address-results" role="listbox" aria-label="Matching properties">
          {results.map((p, i) => (
            <li
              key={p.pid}
              id={`result-${i}`}
              role="option"
              aria-selected={active === i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(p)}
            >
              <span>{shortAddress(p.address)}</span>
              <small>
                {p.landUse} · Parcel {p.pid}
              </small>
            </li>
          ))}
        </ul>
      )}
      <p id="search-status" className="small muted" role="status">
        {status}
      </p>
      <button className="text-button" onClick={() => onSelect(DEMO_PID)} disabled={busy}>
        Try a demo property <span aria-hidden="true">↗</span>
      </button>
      <p className="small muted">
        Real public record: 59 Brighton Av, Unit 59-3. No account needed.
      </p>
    </div>
  )
}

// components/Settings/CitySelector.tsx
// Interactive city picker: search input + GPS detection + grouped accordion list.
// Saves the selected city to profiles.city via upsert and updates the Zustand store.
'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconSearch,
  IconCurrentLocation,
  IconCheck,
  IconLoader2,
  IconAlertCircle,
  IconChevronDown,
  IconMapPin,
} from '@tabler/icons-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import {
  CITIES,
  CONTINENT_ORDER,
  findNearestCity,
  findCityByDisplayName,
  type City,
  type Continent,
} from '@/lib/cityData'
import { useGardenStore } from '@/lib/store'

// ── Props ─────────────────────────────────────────────────────────────────────

interface CitySelectorProps {
  /** City displayName currently stored in profiles.city. Empty string = not set. */
  initialCity: string
  /** Supabase user ID — needed for the DB upsert. */
  userId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONTINENT_EMOJI: Record<Continent, string> = {
  'North America':        '🌎',
  'Latin America':        '🌎',
  'Europe':               '🌍',
  'Middle East & Africa': '🌍',
  'Asia Pacific':         '🌏',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CitySelector({ initialCity, userId }: CitySelectorProps) {
  const router  = useRouter()
  const setCity = useGardenStore(s => s.setCity)
  const listRef = useRef<HTMLDivElement>(null)

  const [query,       setQuery]       = useState('')
  const [activeCity,  setActiveCity]  = useState<string>(initialCity)
  const [savingCity,  setSavingCity]  = useState<string | null>(null)
  const [savedCity,   setSavedCity]   = useState<string | null>(null)
  const [saveError,   setSaveError]   = useState<string | null>(null)
  const [gpsState,    setGpsState]    = useState<'idle' | 'loading' | 'denied'>('idle')
  const [gpsDetected, setGpsDetected] = useState<string | null>(null)

  // Which continent sections are currently expanded.
  // Default: open the continent of the current city; otherwise all closed.
  const [openSections, setOpenSections] = useState<Set<Continent>>(() => {
    if (initialCity) {
      const city = findCityByDisplayName(initialCity)
      if (city) return new Set([city.continent])
    }
    return new Set<Continent>()
  })

  // ── Filtered list (for search mode) ───────────────────────────────────────

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null   // null = not in search mode → show grouped accordion
    return CITIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q),
    )
  }, [query])

  // ── Grouped structure (for accordion mode) ────────────────────────────────

  const groupedCities = useMemo(() =>
    CONTINENT_ORDER.map(continent => ({
      continent,
      cities: CITIES.filter(c => c.continent === continent),
    })),
  [])

  // ── Scroll GPS-detected city into view ────────────────────────────────────

  useEffect(() => {
    if (!gpsDetected || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-city="${CSS.escape(gpsDetected)}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [gpsDetected])

  // ── Section toggle ────────────────────────────────────────────────────────

  const toggleSection = useCallback((continent: Continent) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(continent) ? next.delete(continent) : next.add(continent)
      return next
    })
  }, [])

  // ── Save handler ──────────────────────────────────────────────────────────
  // Strategy: UPDATE the existing profile row first (auth trigger should have
  // created it at signup).  If 0 rows matched (profile somehow missing), fall
  // back to INSERT.  Navigates to /settings — not router.back() — so the
  // server component re-fetches the updated city from DB rather than serving
  // a cached history entry.

  const saveCity = useCallback(async (city: City) => {
    if (savingCity || savedCity) return   // debounce double-tap
    setSaveError(null)
    setSavingCity(city.displayName)

    try {
      const supabase = createSupabaseBrowserClient()

      // Confirm the browser session is active before attempting a write.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired — please sign out and sign in again.')

      // 1. Try UPDATE (profile row exists for every signed-up user)
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ city: city.displayName })
        .eq('user_id', userId)
        .select('user_id')

      if (updateError) throw updateError

      // 2. If 0 rows matched the UPDATE, profile row is missing — insert it
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: userId, city: city.displayName })
        if (insertError) throw insertError
      }

      // Update Zustand immediately so community garden has the new city before
      // the server re-render completes.
      setCity(city.displayName)
      setActiveCity(city.displayName)
      setSavingCity(null)
      setSavedCity(city.displayName)

      // Push to /settings (not router.back) to trigger a fresh server fetch of
      // the updated city value.
      setTimeout(() => router.push('/settings'), 900)
    } catch (err) {
      // PostgrestError objects are not Error instances — extract .message directly.
      const msg = (err as { message?: string })?.message ?? String(err)
      console.error('[CitySelector] save failed:', err)
      setSavingCity(null)
      setSaveError(msg || 'Save failed — please try again')
    }
  }, [savingCity, savedCity, userId, setCity, router])

  // ── GPS handler ───────────────────────────────────────────────────────────

  const handleGps = useCallback(() => {
    if (gpsState === 'loading') return
    if (!navigator.geolocation) { setGpsState('denied'); return }

    setGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude)
        setGpsState('idle')
        setQuery('')                          // clear search → back to accordion
        // Expand the nearest city's continent section
        setOpenSections(prev => new Set([...prev, nearest.continent]))
        setGpsDetected(nearest.displayName)
      },
      () => setGpsState('denied'),
      { timeout: 8000 },
    )
  }, [gpsState])

  // ── Render ────────────────────────────────────────────────────────────────

  const isSearching = filteredCities !== null

  return (
    <div style={{ fontFamily: 'var(--font-sans)' }}>

      {/* ── Current city banner ─────────────────────────────────────────── */}
      {activeCity && !savedCity && !saveError && (
        <div style={{
          margin: '0 16px 10px',
          padding: '8px 12px',
          background: 'var(--success-bg)',
          border: '0.5px solid rgba(107,158,107,0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <IconMapPin size={13} strokeWidth={1.75} color="var(--success)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--success)', lineHeight: 1.4 }}>
            Currently: <strong style={{ fontWeight: 600 }}>{activeCity}</strong>
          </span>
        </div>
      )}

      {/* ── Saved confirmation ───────────────────────────────────────────── */}
      {savedCity && (
        <div style={{
          margin: '0 16px 10px',
          padding: '8px 12px',
          background: 'var(--success-bg)',
          border: '0.5px solid rgba(107,158,107,0.25)',
          borderRadius: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <IconCheck size={13} strokeWidth={2} color="var(--success)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>
            Saved! Heading back…
          </span>
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {saveError && (
        <div style={{
          margin: '0 16px 10px',
          padding: '8px 12px',
          background: 'var(--warning-bg)',
          border: '0.5px solid rgba(196,147,90,0.25)',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <IconAlertCircle size={13} strokeWidth={1.75} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--warning)', lineHeight: 1.5 }}>{saveError}</span>
          </div>
          {/* Migration hint: city column doesn't exist yet */}
          {/column.*city|city.*column/i.test(saveError) && (
            <p style={{
              margin: 0, fontSize: 11, color: 'var(--sage-500)', lineHeight: 1.5,
              paddingLeft: 21,
            }}>
              Run <strong>supabase/migrations/003_community_layout.sql</strong> in your
              Supabase SQL Editor, then try again.
            </p>
          )}
        </div>
      )}

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div style={{
        margin: '0 16px 8px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-default)',
        borderRadius: 10,
        padding: '0 12px',
        height: 40,
      }}>
        <IconSearch size={15} strokeWidth={1.75} color="var(--sage-400)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search city or country…"
          style={{
            flex: 1,
            fontSize: 13,
            color: 'var(--sage-900)',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--sage-400)', flexShrink: 0, lineHeight: 1, fontSize: 18,
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* ── "Use my location" row ─────────────────────────────────────────── */}
      <div style={{ margin: '0 16px 10px' }}>
        <button
          onClick={handleGps}
          disabled={gpsState === 'loading'}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            background: 'var(--bg-card)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 10,
            cursor: gpsState === 'loading' ? 'default' : 'pointer',
            textAlign: 'left',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div style={{
            width: 20, height: 20, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {gpsState === 'loading' ? (
              <SpinnerIcon />
            ) : (
              <IconCurrentLocation
                size={17} strokeWidth={1.75}
                color={gpsState === 'denied' ? 'var(--sage-300)' : 'var(--info)'}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 500,
              color: gpsState === 'denied' ? 'var(--sage-400)' : 'var(--sage-900)',
              lineHeight: 1.3,
            }}>
              Use my location
            </div>
            {gpsState === 'denied' && (
              <div style={{
                fontSize: 11, color: 'var(--warning)', marginTop: 2, lineHeight: 1.3,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <IconAlertCircle size={11} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                Location denied — please select manually
              </div>
            )}
          </div>
        </button>
      </div>

      {/* ── City list ─────────────────────────────────────────────────────── */}
      <div ref={listRef} style={{ padding: '0 16px 100px' }}>

        {/* ── SEARCH MODE: flat results ─────────────────────────────────── */}
        {isSearching && (
          <>
            {filteredCities!.length === 0 ? (
              <div style={{
                padding: '24px 0', textAlign: 'center',
                fontSize: 13, color: 'var(--sage-300)',
              }}>
                No cities match "{query}"
              </div>
            ) : (
              <div style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-default)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                {filteredCities!.map((city, i) => (
                  <CityRow
                    key={city.displayName}
                    city={city}
                    isFirst={i === 0}
                    activeCity={activeCity}
                    savingCity={savingCity}
                    savedCity={savedCity}
                    gpsDetected={gpsDetected}
                    onSelect={saveCity}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── ACCORDION MODE: grouped by continent ─────────────────────── */}
        {!isSearching && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupedCities.map(({ continent, cities }) => {
              const isOpen     = openSections.has(continent)
              const hasActive  = cities.some(c => c.displayName === activeCity)
              const hasGps     = cities.some(c => c.displayName === gpsDetected)

              return (
                <div key={continent} style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-default)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  {/* Section header — tappable */}
                  <button
                    onClick={() => toggleSection(continent)}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>
                      {CONTINENT_EMOJI[continent]}
                    </span>

                    <span style={{
                      flex: 1, fontSize: 13, fontWeight: 600,
                      color: 'var(--sage-900)', lineHeight: 1.3,
                    }}>
                      {continent}
                    </span>

                    {/* Indicators */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {(hasActive || hasGps) && (
                        <span style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: hasActive ? 'var(--success)' : 'var(--info)',
                          flexShrink: 0,
                        }} />
                      )}
                      <span style={{ fontSize: 10, color: 'var(--sage-300)', flexShrink: 0 }}>
                        {cities.length}
                      </span>
                      <span style={{
                        display: 'flex',
                        color: 'var(--sage-400)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                      }}>
                        <IconChevronDown size={15} strokeWidth={1.75} />
                      </span>
                    </div>
                  </button>

                  {/* Divider only when open */}
                  {isOpen && (
                    <div style={{ height: 0.5, background: 'var(--border-subtle)' }} />
                  )}

                  {/* City rows — collapsed when section is closed */}
                  {isOpen && cities.map((city, i) => (
                    <CityRow
                      key={city.displayName}
                      city={city}
                      isFirst={i === 0}
                      activeCity={activeCity}
                      savingCity={savingCity}
                      savedCity={savedCity}
                      gpsDetected={gpsDetected}
                      onSelect={saveCity}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── CityRow sub-component ─────────────────────────────────────────────────────

interface CityRowProps {
  city: City
  isFirst: boolean
  activeCity: string
  savingCity: string | null
  savedCity: string | null
  gpsDetected: string | null
  onSelect: (city: City) => void
}

function CityRow({ city, isFirst, activeCity, savingCity, savedCity, gpsDetected, onSelect }: CityRowProps) {
  const isSaving  = savingCity === city.displayName
  const isSaved   = savedCity  === city.displayName
  const isCurrent = activeCity === city.displayName && !isSaved
  const isGps     = gpsDetected === city.displayName && !isCurrent

  return (
    <>
      {!isFirst && (
        <div style={{ height: 0.5, background: 'var(--border-subtle)', marginLeft: 14 }} />
      )}
      <button
        data-city={city.displayName}
        onClick={() => onSelect(city)}
        disabled={!!(savingCity || savedCity)}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: (isCurrent || isGps) ? 'var(--glass-sage-light)' : 'transparent',
          border: 'none',
          cursor: (savingCity || savedCity) ? 'default' : 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {/* Left icon */}
        <div style={{
          width: 18, height: 18, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSaving ? (
            <SpinnerIcon />
          ) : (isSaved || isCurrent) ? (
            <IconCheck size={15} strokeWidth={2} color="var(--success)" />
          ) : isGps ? (
            <IconCurrentLocation size={14} strokeWidth={1.75} color="var(--info)" />
          ) : (
            <span style={{ fontSize: 12, opacity: 0.5 }}>·</span>
          )}
        </div>

        {/* City name */}
        <span style={{
          flex: 1, fontSize: 13,
          fontWeight: (isCurrent || isGps) ? 500 : 400,
          color: isSaved   ? 'var(--success)'
               : isCurrent ? 'var(--success)'
               : isGps     ? 'var(--info)'
               : 'var(--sage-700)',
          lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {city.displayName}
        </span>

        {isGps && !isSaving && (
          <span style={{ fontSize: 10, color: 'var(--info)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            nearest
          </span>
        )}
      </button>
    </>
  )
}

// ── Inline CSS-animated spinner ───────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <>
      <style>{`@keyframes gl-spin{to{transform:rotate(360deg)}}.gl-spin{animation:gl-spin .7s linear infinite;display:flex}`}</style>
      <span className="gl-spin">
        <IconLoader2 size={14} strokeWidth={1.75} color="var(--sage-400)" />
      </span>
    </>
  )
}

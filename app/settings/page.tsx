// app/settings/page.tsx — Settings landing page (Server Component)
// Accessible from Profile → Settings menu item.
// For now exposes a single "City / Location" row.
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { IconArrowLeft, IconChevronRight, IconMapPin } from '@tabler/icons-react'
import { getServerUser } from '@/lib/auth'
import { getProfileByUserId } from '@/lib/queries'

export default async function SettingsPage() {
  const user    = await getServerUser()
  const profile = user ? await getProfileByUserId(user.id).catch(() => null) : null

  // City: prefer profile DB value → empty (never shows stale data)
  const currentCity = profile?.city?.trim() || ''

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
      paddingBottom: 100,
    }}>

      {/* ── Sticky header ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px',
        background: 'var(--glass-cream-medium)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '0.5px solid var(--border-default)',
      }}>
        <Link
          href="/profile"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back to Profile"
        >
          <IconArrowLeft size={16} strokeWidth={1.7} />
        </Link>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)' }}>
          Settings
        </span>
      </div>

      {/* ── Auth gate ───────────────────────────────────────────────────────── */}
      {!user && (
        <div style={{
          margin: '20px 16px 0',
          padding: '14px 16px',
          background: 'var(--warning-bg)',
          border: '0.5px solid rgba(196,147,90,0.25)',
          borderRadius: 12,
          fontSize: 13,
          color: 'var(--warning)',
          lineHeight: 1.5,
        }}>
          ⚠️ Sign in to manage your settings and save your city for the community garden.
        </div>
      )}

      {/* ── Location section ────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          fontSize: 10, fontWeight: 500,
          color: 'var(--sage-300)', letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}>
          Location
        </div>

        <div style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {user ? (
            <Link
              href="/settings/city"
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px',
              }}>
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--info-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconMapPin size={17} strokeWidth={1.75} color="var(--info)" />
                </div>

                {/* Label + value */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage-900)', lineHeight: 1.3 }}>
                    City
                  </div>
                  <div style={{
                    fontSize: 11, color: currentCity ? 'var(--sage-500)' : 'var(--sage-300)',
                    marginTop: 1, lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {currentCity || 'Not set — tap to choose your city'}
                  </div>
                </div>

                <IconChevronRight size={16} color="var(--sage-400)" strokeWidth={1.7} style={{ flexShrink: 0 }} />
              </div>
            </Link>
          ) : (
            /* Disabled-looking row when not signed in */
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 16px', opacity: 0.45,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: 'var(--glass-sage-medium)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconMapPin size={17} strokeWidth={1.75} color="var(--sage-400)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--sage-700)', lineHeight: 1.3 }}>
                  City
                </div>
                <div style={{ fontSize: 11, color: 'var(--sage-300)', marginTop: 1 }}>
                  Sign in to set
                </div>
              </div>
              <IconChevronRight size={16} color="var(--sage-300)" strokeWidth={1.7} style={{ flexShrink: 0 }} />
            </div>
          )}
        </div>

        {/* Helper text */}
        <p style={{
          fontSize: 11, color: 'var(--sage-300)', lineHeight: 1.6,
          margin: '8px 2px 0',
        }}>
          Your city helps GardenLink show you gardeners nearby in the Community Garden.
        </p>
      </div>
    </div>
  )
}

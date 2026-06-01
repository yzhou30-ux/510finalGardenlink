// app/settings/city/page.tsx — City selector page (Server Component shell)
// Fetches the current city from DB, then renders the interactive CitySelector.
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { IconArrowLeft } from '@tabler/icons-react'
import { getServerUser } from '@/lib/auth'
import { getProfileByUserId } from '@/lib/queries'
import { CitySelector } from '@/components/Settings/CitySelector'

export default async function CityPage() {
  const user = await getServerUser()

  // City selection requires an account — redirect guests to sign-in.
  if (!user) redirect('/auth/login')

  const profile     = await getProfileByUserId(user.id).catch(() => null)
  const currentCity = profile?.city?.trim() ?? ''

  return (
    <div style={{
      maxWidth: 480,
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--bg-base)',
      fontFamily: 'var(--font-sans)',
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
          href="/settings"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--glass-sage-light)',
            border: '0.5px solid var(--border-default)',
            color: 'var(--sage-700)', textDecoration: 'none', flexShrink: 0,
          }}
          aria-label="Back to Settings"
        >
          <IconArrowLeft size={16} strokeWidth={1.7} />
        </Link>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--sage-900)' }}>
          Choose City
        </span>
      </div>

      {/* Subheading */}
      <div style={{ padding: '12px 16px 10px' }}>
        <p style={{
          fontSize: 12, color: 'var(--sage-400)', lineHeight: 1.6, margin: 0,
        }}>
          Select the city you garden in. This is used to connect you with nearby
          gardeners in the Community Garden.
        </p>
      </div>

      {/* Interactive city picker — client component */}
      <CitySelector initialCity={currentCity} userId={user.id} />
    </div>
  )
}

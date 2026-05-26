// app/auth/login/page.tsx
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Sign In — GardenLink' }

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Logo / brand */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🪴</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--sage-900)', margin: 0 }}>
          GardenLink
        </h1>
        <p style={{ fontSize: 12, color: 'var(--sage-400)', marginTop: 4 }}>
          Your personal plant journal
        </p>
      </div>

      {/* Error from callback */}
      {searchParams.error && (
        <div style={{
          width: '100%', maxWidth: 360,
          background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)',
          borderRadius: 10, padding: '10px 14px',
          fontSize: 12, color: 'var(--danger)', marginBottom: 16,
        }}>
          {searchParams.error === 'callback_failed'
            ? 'Email confirmation failed. Please try again.'
            : decodeURIComponent(searchParams.error)}
        </div>
      )}

      <LoginForm nextUrl={searchParams.next ?? '/garden'} />

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--sage-400)' }}>
        No account?{' '}
        <a href={`/auth/signup${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ''}`}
          style={{ color: 'var(--sage-700)', textDecoration: 'none', fontWeight: 500 }}>
          Sign up
        </a>
      </p>
    </div>
  )
}

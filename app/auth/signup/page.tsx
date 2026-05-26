// app/auth/signup/page.tsx
import { SignupForm } from './SignupForm'

export const metadata = { title: 'Create Account — GardenLink' }

export default function SignupPage({ searchParams }: { searchParams: { next?: string } }) {
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
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--sage-900)', margin: 0 }}>
          Start your garden
        </h1>
        <p style={{ fontSize: 12, color: 'var(--sage-400)', marginTop: 4 }}>
          Create a free account
        </p>
      </div>

      <SignupForm nextUrl={searchParams.next ?? '/garden'} />

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--sage-400)' }}>
        Already have an account?{' '}
        <a href={`/auth/login${searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : ''}`}
          style={{ color: 'var(--sage-700)', textDecoration: 'none', fontWeight: 500 }}>
          Sign in
        </a>
      </p>
    </div>
  )
}

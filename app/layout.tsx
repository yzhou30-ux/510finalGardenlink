import type { Metadata } from 'next'
import './globals.css'
import { FloatingTabBar } from '@/components/FloatingTabBar'

export const metadata: Metadata = {
  title: 'GardenLink',
  description: 'Plant journal & garden community',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: 'var(--bg-base)', color: 'var(--sage-900)', fontFamily: 'var(--font-sans)', minHeight: '100vh', margin: 0 }}>
        <main style={{ paddingBottom: '80px' }}>
          {children}
        </main>
        <FloatingTabBar />
      </body>
    </html>
  )
}

import { render, screen } from '@testing-library/react'

// Mock next/navigation
const mockUsePathname = jest.fn()
const mockUseRouter = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter:   () => mockUseRouter(),
}))

// Mock next/link as a plain <a>
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>
  }
})

// Mock useAuthStatus so it doesn't hit Supabase
jest.mock('@/lib/useAuthStatus', () => ({
  useAuthStatus: () => ({ isAuthenticated: true, isGuest: false }),
}))

// Mock AuthOverlay so overlay tests are isolated
jest.mock('@/components/AuthOverlay', () => ({
  AuthOverlay: () => <div data-testid="auth-overlay" />,
}))

import { FloatingTabBar } from '@/components/FloatingTabBar'

beforeEach(() => {
  mockUsePathname.mockReturnValue('/garden')
  mockUseRouter.mockReturnValue({ push: jest.fn() })
})

describe('FloatingTabBar', () => {
  it('renders Garden, Timeline, and Profile tabs', () => {
    render(<FloatingTabBar />)
    expect(screen.getByText('Garden')).toBeInTheDocument()
    expect(screen.getByText('Timeline')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders a camera button with aria-label', () => {
    render(<FloatingTabBar />)
    expect(screen.getByLabelText('Take photo')).toBeInTheDocument()
  })

  it('Garden tab is a link pointing to /garden', () => {
    render(<FloatingTabBar />)
    const gardenLink = screen.getByText('Garden').closest('a')
    expect(gardenLink).toHaveAttribute('href', '/garden')
  })

  it('Timeline tab is a button (not a link)', () => {
    render(<FloatingTabBar />)
    const timelineEl = screen.getByText('Timeline').closest('button')
    expect(timelineEl).not.toBeNull()
  })

  it('Profile tab is a button (not a link)', () => {
    render(<FloatingTabBar />)
    const profileEl = screen.getByText('Profile').closest('button')
    expect(profileEl).not.toBeNull()
  })

  it('returns null on /auth paths', () => {
    mockUsePathname.mockReturnValue('/auth/login')
    const { container } = render(<FloatingTabBar />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null on /camera path', () => {
    mockUsePathname.mockReturnValue('/camera')
    const { container } = render(<FloatingTabBar />)
    expect(container.firstChild).toBeNull()
  })
})

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS variable references - full tokens in globals.css
        'bg-base': 'var(--bg-base)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'sage-900': 'var(--sage-900)',
        'sage-700': 'var(--sage-700)',
        'sage-500': 'var(--sage-500)',
        'sage-400': 'var(--sage-400)',
        'sage-300': 'var(--sage-300)',
        'info': 'var(--info)',
        'warning': 'var(--warning)',
        'success': 'var(--success)',
        'danger': 'var(--danger)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
    },
  },
  plugins: [],
}

export default config

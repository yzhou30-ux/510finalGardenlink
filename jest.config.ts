// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Exclude legacy code (read-only reference, not part of this project)
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/legacy/'],
  // tsconfig.json uses "jsx":"preserve" for Next.js, but Jest needs react-jsx
  // to parse JSX in .tsx test files.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
}

export default config

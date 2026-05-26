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
}

export default config

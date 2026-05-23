import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@cron/(.*)$': '<rootDir>/src/cron/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/index.ts',
    '!src/**/types/**',
    '!src/**/*.swagger.ts',
    '!src/**/*.swagger.docs.ts',
    '!src/cron/**',
    '!src/database/migrations/**',
    '!src/database/csv-import/**',
    '!src/database/reset-for-production.ts',
    '!src/database/validate-production.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 18, // Actual: 23.23% → threshold: 23.23 - 5 = 18.23 → 18
      functions: 28, // Actual: 33.26% → threshold: 33.26 - 5 = 28.26 → 28
      lines: 32,    // Actual: 37.78% → threshold: 37.78 - 5 = 32.78 → 32
      statements: 32, // Actual: 37.17% → threshold: 37.17 - 5 = 32.17 → 32
    },
  },
  testTimeout: 15000,
  clearMocks: true,
  restoreMocks: true,
};

export default config;

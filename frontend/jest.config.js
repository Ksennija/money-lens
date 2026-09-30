/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.(js|tsx?)$': '$1',
    '\\.(css|less|scss)$': '<rootDir>/jest.styleMock.js',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
};

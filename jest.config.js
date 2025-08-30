module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: [
    '<rootDir>/lib/',
    '<rootDir>/nitrogen/',
    '<rootDir>/example/',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/example/',
    '<rootDir>/node_modules/',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/?(*.)+(spec|test).{js,jsx,ts,tsx}',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
  setupFilesAfterEnv: [],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{js,ts}',
    '!src/**/*.nitro.ts',
  ],
};
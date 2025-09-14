module.exports = {
  displayName: 'Backend',
  testEnvironment: 'node',
  rootDir: '../../',
  testMatch: [
    '<rootDir>/tests/backend/**/*.test.js'
  ],
  coverageDirectory: '<rootDir>/coverage/backend',
  collectCoverageFrom: [
    '<rootDir>/src/**/*.js',
    '!<rootDir>/src/server.js', // Exclude entry point
    '!<rootDir>/src/database/migrations/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/backend.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000
};
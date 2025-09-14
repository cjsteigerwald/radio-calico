module.exports = {
  displayName: 'Frontend',
  testEnvironment: 'jsdom',
  rootDir: '../../',
  testMatch: [
    '<rootDir>/tests/frontend/**/*.test.js'
  ],
  coverageDirectory: '<rootDir>/coverage/frontend',
  collectCoverageFrom: [
    '<rootDir>/public/js/**/*.js',
    '!<rootDir>/public/js/lib/**', // Exclude external libraries
    '!<rootDir>/public/sw.js' // Service worker tested separately
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/frontend.setup.js'],
  moduleNameMapper: {
    '^@public/(.*)$': '<rootDir>/public/$1',
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/mocks/styleMock.js'
  },
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]]
    }]
  },
  testTimeout: 10000
};
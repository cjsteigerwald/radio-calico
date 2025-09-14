module.exports = {
  projects: [
    '<rootDir>/tests/setup/jest.backend.config.js',
    '<rootDir>/tests/setup/jest.frontend.config.js'
  ],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'public/js/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**',
    '!**/tests/**'
  ],
  coverageReporters: ['text', 'lcov', 'html', 'text-summary'],
  testPathIgnorePatterns: ['/node_modules/'],
  watchPathIgnorePatterns: ['/node_modules/', '/coverage/'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml'
    }]
  ]
};
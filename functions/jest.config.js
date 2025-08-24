module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!jest.config.js',
    '!coverage/**',
    '!node_modules/**'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/integration/'
  ],
  testTimeout: 30000,
  verbose: true
};
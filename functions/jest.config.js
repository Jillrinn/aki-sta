module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!jest.config.js',
    '!coverage/**',
    '!node_modules/**'
  ],
  testMatch: [
    '**/*.test.js'
  ],
  verbose: true
};
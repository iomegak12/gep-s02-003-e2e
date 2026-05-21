/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/*.spec.js'],
  testTimeout: 30000,
  globalSetup: '<rootDir>/helpers/wait-for-stack.js',
  setupFiles: ['<rootDir>/helpers/load-env.js'],
  verbose: true,
  maxWorkers: '50%',

  // ---- Coverage ----
  collectCoverage: true,
  coverageDirectory: '<rootDir>/../coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/*.spec.js',
    '!helpers/wait-for-stack.js',
    '!helpers/load-env.js'
  ],
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
};

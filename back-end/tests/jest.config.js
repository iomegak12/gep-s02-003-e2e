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
};

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/*.spec.js'],
  testTimeout: 60000,
  setupFiles: ['<rootDir>/helpers/load-env.js'],
  verbose: true,
  maxWorkers: 1,
};

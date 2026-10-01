const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });
const customJestConfig = { testEnvironment: 'jsdom', setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'] };
module.exports = createJestConfig(customJestConfig);

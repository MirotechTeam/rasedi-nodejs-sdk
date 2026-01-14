import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Where Jest should look for tests
  testMatch: ["**/__tests__/**/*.test.ts", "**/?(*.)+(spec|test).ts"],

  // Automatically clear mocks between tests
  clearMocks: true,

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",

  // Ignore build output and dependencies
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/build/"],

  // Resolve TypeScript path aliases (matches tsconfig paths)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Optional: run setup before each test
  setupFilesAfterEnv: [],

  // Speed up test runs
  maxWorkers: "50%",
};

export default config;

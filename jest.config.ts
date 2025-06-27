/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from "jest";
import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

const config: Config = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "node",
  preset: "ts-jest",
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: ["/node_modules/(?!uuid|@noble|@scure|starknet)/"],
};

export default config;

import type { Config } from 'jest';
import { moduleNameMapper } from './jest.config';

const config: Config = {
  rootDir: './',
  testMatch: ['**/*.e2e-spec.ts'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 30000,
  moduleNameMapper,
};

export default config;

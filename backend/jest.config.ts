import type { Config } from 'jest';

export const moduleNameMapper = {
  '^@app/(.*)$': '<rootDir>/src/$1',
  '^@auth/(.*)$': '<rootDir>/src/auth/$1',
  '^@users/(.*)$': '<rootDir>/src/users/$1',
  '^@common/(.*)$': '<rootDir>/src/common/$1',
  '^@config/(.*)$': '<rootDir>/src/config/$1',
  '^@prisma-local/(.*)$': '<rootDir>/src/prisma/$1',
  '^@health/(.*)$': '<rootDir>/src/health/$1',
  '^@logger/(.*)$': '<rootDir>/src/logger/$1',
  '^@token/(.*)$': '<rootDir>/src/token/$1',
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@audit-log/(.*)$': '<rootDir>/src/audit-log/$1',
};

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/dto/*.ts',
    '!src/**/interfaces/*.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  moduleNameMapper: moduleNameMapper,
};

export default config;

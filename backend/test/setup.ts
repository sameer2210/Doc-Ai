/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(__dirname, '../.env');
const envTestPath = path.resolve(__dirname, '../.env.test');

// Load environment variables from .env file explicitly
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Override with .env.test if it exists
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
}

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  console.warn(
    '[Test Setup] TEST_DATABASE_URL is not set. Tests will run against the default DATABASE_URL.',
  );
}

// Prevent tests from accidentally running against the production/shared Supabase database
const dbUrl = process.env.DATABASE_URL || '';
const isProductionDb = dbUrl.includes('supabase.com') || dbUrl.includes('pooler.supabase.com');
if (isProductionDb) {
  throw new Error(
    `[Test Setup] ERROR: Attempted to run tests against the production/shared database (${dbUrl}). ` +
    'Tests must run against a dedicated local test database. Please set a valid TEST_DATABASE_URL in .env.test.',
  );
}

// Increase timeout for slow DB/network calls (optional)
jest.setTimeout(10000);

// Example: Log each test start
beforeEach(() => {
  console.log('Starting test...');
});


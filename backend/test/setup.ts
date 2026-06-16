/* eslint-disable no-console */
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file explicitly for the test environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else {
  console.warn(
    '[Test Setup] TEST_DATABASE_URL is not set. Tests will run against the default DATABASE_URL.',
  );
}

// Increase timeout for slow DB/network calls (optional)
jest.setTimeout(10000);

// Example: Log each test start
beforeEach(() => {
  console.log('Starting test...');
});

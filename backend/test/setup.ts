// Increase timeout for slow DB/network calls (optional)
jest.setTimeout(10000);

// Optional: Add custom matchers or globals
// import 'jest-extended'; // if using

// Example: Log each test start
beforeEach(() => {
  console.log('Starting test...');
});

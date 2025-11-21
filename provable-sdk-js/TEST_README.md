# TypeScript SDK Tests

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Structure

- `src/config.test.ts` - Tests for configuration and validation
- `src/hash.test.ts` - Tests for hash functions (keccak256, sha256)
- `src/api.test.ts` - Tests for API calls (mocked)
- `src/prove.test.ts` - Tests for prove functions

## Test Coverage

The tests cover:
- ✓ Hash functions (keccak256, sha256, and string variants)
- ✓ Data type validation (length and hex character validation)
- ✓ API calls with default and custom data types
- ✓ Error handling for invalid inputs
- ✓ Consistency of hash outputs

## Mocking

API tests use Vitest's mocking capabilities to mock `fetch` calls, so no actual HTTP requests are made during testing.

# Go SDK Tests

## Running Tests

### Run All Tests
```bash
go test ./...
```

### Run Tests with Verbose Output
```bash
go test -v ./...
```

### Run Tests with Coverage
```bash
go test -cover ./...
```

### Generate Coverage Report
```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Run Specific Test
```bash
go test -run TestKeccak256
```

### Run Tests in a Specific File
```bash
go test -run TestHash
```

## Test Structure

- `config_test.go` - Tests for configuration and validation
- `hash_test.go` - Tests for hash functions (keccak256, sha256)
- `api_test.go` - Tests for API validation
- `prove_test.go` - Tests for prove functions

## Test Coverage

The tests cover:
- ✓ Hash functions (Keccak256, SHA256, and string variants)
- ✓ Data type validation (length and hex character validation)
- ✓ Function signatures and compilation checks
- ✓ Error handling for invalid inputs
- ✓ Consistency of hash outputs
- ✓ Edge cases (empty data, large data, etc.)

## Note on API Tests

The API tests focus on validation logic and function signatures. Full integration tests would require HTTP mocking, which can be added using libraries like `httptest` or third-party mocking frameworks.

## Benchmarking

Run benchmarks if you add them:
```bash
go test -bench=. -benchmem
```

## Race Detection

Run tests with race detector:
```bash
go test -race ./...
```

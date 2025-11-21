# Provable SDK

A multi-language SDK for interacting with the Provable API. This monorepo contains implementations for TypeScript/JavaScript, Python, and Go.

Cryptographic, timestamped notarization for your critical APIs.

Do not send raw data to Provable. Use the embedded `hash` function or hash the data with your preferred hash function.

## SDKs

This monorepo contains three SDKs:

- **TypeScript/JavaScript** (`provable-sdk-js/`) - For Node.js and browser applications
- **Python** (`provable-sdk-py/`) - For Python 3.8+ applications
- **Go** (`provable-sdk-go/`) - For Go 1.21+ applications

## Quick Start

### Install Dependencies

```bash
make install
```

This installs dependencies for all three SDKs.

### Run All Tests

```bash
make test
```

### Run Tests with Coverage

```bash
make coverage
```

## Available Make Commands

### Testing

| Command | Description |
|---------|-------------|
| `make test` | Run all tests across all SDKs |
| `make test-js` | Run TypeScript SDK tests |
| `make test-py` | Run Python SDK tests |
| `make test-go` | Run Go SDK tests |
| `make test-quick` | Quick test run (minimal output) |

### Coverage

| Command | Description |
|---------|-------------|
| `make coverage` | Generate coverage for all SDKs |
| `make coverage-js` | TypeScript coverage report |
| `make coverage-py` | Python coverage report (HTML + terminal) |
| `make coverage-go` | Go coverage report (HTML) |

### Installation

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies for all SDKs |
| `make install-js` | Install TypeScript dependencies |
| `make install-py` | Install Python dependencies |
| `make install-go` | Download Go modules |

### Maintenance

| Command | Description |
|---------|-------------|
| `make clean` | Remove build artifacts and caches |
| `make watch-js` | Run TypeScript tests in watch mode |
| `make ci` | Run full CI suite (tests + coverage) |

### Specific Test Files

| Command | Description |
|---------|-------------|
| `make test-js-hash` | Run only TypeScript hash tests |
| `make test-py-hash` | Run only Python hash tests |
| `make test-go-hash` | Run only Go hash tests |

## Features

All SDKs provide:

### Lightnet Integration
- Database operations (query, stats, browse)
- Hash verification and computation
- Merkle proof generation and verification
- gRPC operations

### Configuration
- Default data type: `"provable_sdk"` (padded to 32 bytes)
- Customizable per-call data types
- Automatic validation (must be 64 hex characters)

## Data Type

All SDKs default to using `"provable_sdk"` as the data type identifier, which is:
- Hex encoded: `0x70726f7661626c655f73646b`
- Padded to 32 bytes: `70726f7661626c655f73646b00000000000000000000000000000000000000000000`

You can override this on any API call:

**TypeScript:**
```typescript
prove_single_hash(myHash, customDataType);
```

**Python:**
```python
prove_single_hash(my_hash, data_type=custom_data_type)
```

**Go:**
```go
ProveSingleHash(myHash, customDataType)
```

## SDK-Specific Documentation

Each SDK has its own README with detailed usage examples:

- [TypeScript SDK](./provable-sdk-js/README.md)
- [Python SDK](./provable-sdk-py/README.md)
- [Go SDK](./provable-sdk-go/README.md)

## Testing Documentation

Each SDK has test documentation:

- [TypeScript Tests](./provable-sdk-js/TEST_README.md)
- [Python Tests](./provable-sdk-py/TEST_README.md)
- [Go Tests](./provable-sdk-go/TEST_README.md)

## Development Workflow

### 1. Make Changes
Edit code in any SDK directory.

### 2. Run Tests
```bash
make test
```

### 3. Check Coverage
```bash
make coverage
```

### 4. Clean Up
```bash
make clean
```

## Protobuf Definitions

The Go SDK includes gRPC protocol definitions in `provable-sdk-go/proto/` for direct Lightnet communication. See [proto/README.md](./provable-sdk-go/proto/README.md) for details.

## CI/CD

For continuous integration:

```bash
make ci
```

This runs all tests and generates coverage reports.

## Requirements

- **TypeScript SDK**: Node.js 16+
- **Python SDK**: Python 3.8+
- **Go SDK**: Go 1.21+

## License

MIT

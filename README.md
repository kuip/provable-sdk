# Provable SDK

A multi-language SDK for interacting with the Provable API. This monorepo contains implementations for TypeScript/JavaScript, Python, and Go.

Cryptographic, timestamped notarization for your critical APIs.

Do not send raw data to Provable. Use the embedded `hash` function or hash the data with your preferred hash function.

## SDKs

This monorepo contains four packages:

- **TypeScript/JavaScript** (`provable-sdk-js/`) — `@kuip/provable-sdk` — For Node.js and browser applications
- **Proof envelope helpers** (`provable-proof-js/`) — `@kuip/provable-proof` — For Provable proof JSON and proof-format verification helpers
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
- Default data type: `"provable_sdk"`
- Customizable per-call data types
- Automatic validation (must be 64 hex characters)

## Data Type

All SDKs default to using `"provable_sdk"` as the data type identifier.

### 1. Default usage

If you do not configure anything:

- the SDK uses the built-in default key
- the SDK uses the default `provable_sdk` data type

Examples:

**TypeScript:**
```typescript
prove_single_hash(myHash);
```

**Python:**
```python
prove_single_hash(my_hash)
```

**Go:**
```go
ProveSingleHash(myHash)
```

### 2. Usage with API key and custom data type

If your application stores user-specific settings, pass the private API key and custom data type into the SDK before you prove or verify data.

**TypeScript:**
```typescript
setApiKey(settings.apiKey);
prove_single_hash(myHash, { apiKey: settings.apiKey, dataType: settings.dataType });
```

**Python:**
```python
set_api_key(settings["api_key"])
prove_single_hash(my_hash, data_type=settings["data_type"], api_key=settings["api_key"])
```

**Go:**
```go
SetAPIKey(settings.APIKey)
ProveSingleHashWithOptions(myHash, &RequestOptions{APIKey: settings.APIKey, DataType: settings.DataType})
```

You can override the data type on any API call:

**TypeScript:**
```typescript
prove_single_hash(myHash, { dataType: customDataType });
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
- [Proof Package](./provable-proof-js/README.md)
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

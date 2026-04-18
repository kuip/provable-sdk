# Provable SDK

A multi-language SDK for interacting with the Provable API.
Cryptographic, timestamped notarization for your critical APIs.

Do not send raw data to Provable. Use the embedded `hash` function or hash the data with your preferred hash function.

## SDK-Specific Documentation

Each SDK has its own README with detailed usage examples:

- [TypeScript SDK](./provable-sdk-js/README.md)
- [Proof Package](./provable-proof-js/README.md)
- [Python SDK](./provable-sdk-py/README.md)
- [Go SDK](./provable-sdk-go/README.md)
- [UI Package](./provable-sdk-ui/README.md)

## Development Quick Start

The JavaScript packages use npm workspaces for local development.
From the repo root, npm links the workspace packages locally.

```bash
npm install
npm run build
```

## Install Dependencies

```bash
make install
```

This installs dependencies for the SDK and UI packages.

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

## CI/CD

For continuous integration:

```bash
make ci
```

This runs all tests and generates coverage reports.

## Requirements

- **TypeScript SDK**: Node.js 16+
- **Python SDK**: Python 3.8+
- **Go SDK**: Go 1.23+

## License

MIT

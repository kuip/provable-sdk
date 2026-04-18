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

```bash
make install
make test
make build
make publish
```

The JavaScript packages use npm workspaces for local development.
From the repo root, npm links the workspace packages locally.

```bash
npm install
npm run build
```

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

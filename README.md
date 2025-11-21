# Provable SDK Monorepo

A multi-language SDK for interacting with the Provable API. This monorepo contains implementations for TypeScript/JavaScript, Python, and Go.

Create cryptographic proofs for your APIs.

Do not send raw data to Provable. Use the `hash` function or hash the data with your preferred hash function.

## SDKs

See [provable-sdk-js/README.md](./provable-sdk-js/README.md) for usage details.

See [provable-sdk-py/README.md](./provable-sdk-py/README.md) for usage details.

See [provable-sdk-go/README.md](./provable-sdk-go/README.md) for usage details.

## API

All SDKs provide the following functionality:

### Hash Functions
- `hash` / `keccak256` - Compute keccak256 hash of bytes
- `hash_str` / `keccak256_str` - Compute keccak256 hash of UTF-8 strings

### Prove Functions
- `prove_single_hash` - Submit a hash to Provable's Kayros indexers for timestamping and creating a cryptographic inclusion proof
- `prove_data` - Hash and prove bytes in one call
- `prove_data_str` - Hash and prove a string in one call

### Record Functions
- `get_record_by_hash` - Retrieve a Kayros record by hash

### Verify Function
- `verify` - Verify data against a Kayros proof envelope

## License

MIT

# Provable SDK for TypeScript/JavaScript

A TypeScript/JavaScript SDK for interacting with the Provable Kayros API.

## Installation

```bash
npm install @provable/sdk-js
```

## Usage

```typescript
import {
  hash,
  keccak256,
  hash_str,
  keccak256_str,
  prove_single_hash,
  get_record_by_hash,
  prove_data,
  prove_data_str,
  verify,
  type KayrosEnvelope,
} from '@provable/sdk-js';

// Hash bytes
const data = new Uint8Array([1, 2, 3, 4]);
const dataHash = hash(data); // or keccak256(data)

// Hash string
const str = "Hello, Provable!";
const strHash = hash_str(str); // or keccak256_str(str)

// Prove a hash
const proof = await prove_single_hash(dataHash);

// Get a record by hash
const record = await get_record_by_hash(proof.data.computed_hash_hex);

// Prove data directly
const dataProof = await prove_data(data);

// Prove string data directly
const strProof = await prove_data_str(str);

// Verify data with Kayros proof
const envelope: KayrosEnvelope = {
  data: { message: "Hello, Provable!" },
  kayros: {
    hash: "abc123...",
    hashAlgorithm: 'keccak256',
    timestamp: {
      service: "https://kayros.provable.dev/api/grpc/single-hash",
      response: proof,
    },
  },
};

const result = await verify(envelope);
if (result.valid) {
  console.log("Verification successful!");
} else {
  console.error("Verification failed:", result.error);
}
```

## API

### Hash Functions

- `hash(data: Uint8Array): string` - Compute keccak256 hash of bytes
- `keccak256(data: Uint8Array): string` - Alias for `hash`
- `hash_str(str: string): string` - Compute keccak256 hash of a UTF-8 string
- `keccak256_str(str: string): string` - Alias for `hash_str`

### Prove Functions

- `prove_single_hash(dataHash: string): Promise<ProveSingleHashResponse>` - Prove a hash via Kayros API
- `prove_data(data: Uint8Array): Promise<ProveSingleHashResponse>` - Hash and prove bytes
- `prove_data_str(str: string): Promise<ProveSingleHashResponse>` - Hash and prove a string

### Record Functions

- `get_record_by_hash(recordHash: string): Promise<GetRecordResponse>` - Get Kayros record by hash

### Verify Function

- `verify<T>(envelope: KayrosEnvelope<T>): Promise<VerifyResult>` - Verify data against Kayros proof

## Configuration

Default configuration:
- `KayrosHost`: `https://kayros.provable.dev`
- API Routes:
  - Single Hash: `/api/grpc/single-hash`
  - Get Record: `/api/database/record-by-hash`

## License

MIT

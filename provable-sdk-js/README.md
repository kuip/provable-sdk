# Provable SDK for TypeScript/JavaScript

A TypeScript/JavaScript SDK for interacting with the Provable Kayros API.

## Installation

```bash
npm install provable-sdk-js
```

## Usage

```typescript
import {
  hash,
  keccak256,
  hash_str,
  keccak256_str,
  sha256,
  sha256_str,
  prove_single_hash,
  get_record_by_hash,
  prove_data,
  prove_data_str,
  verify,
  KayrosEnvelope,
} from 'provable-sdk-js';

// Hash bytes (keccak256)
const data = new Uint8Array([1, 2, 3, 4]);
const dataHash = keccak256(data);

// Hash string (sha256 - default)
const str = "Hello, Provable!";
const strHash = await sha256_str(str);

// Prove a hash
const proof = await prove_single_hash(dataHash);

// Get a record by hash
const record = await get_record_by_hash(proof.data.computed_hash_hex);

// Prove data directly
const dataProof = await prove_data(data);

// Prove string data directly
const strProof = await prove_data_str(str);

// Create and verify a KayrosEnvelope
const envelope = new KayrosEnvelope(
  { message: "Hello, Provable!" },
  {
    hash: strHash,
    hashAlgorithm: 'sha256',
    timestamp: {
      service: "kayros",
      response: proof,
    },
  }
);

const result = await verify(envelope);
if (result.valid) {
  console.log("Verification successful!");
} else {
  console.error("Verification failed:", result.error);
}
```

## API

### Hash Functions

- `keccak256(data: Uint8Array): string` - Compute keccak256 hash of bytes
- `keccak256_str(str: string): string` - Compute keccak256 hash of a UTF-8 string
- `sha256(data: Uint8Array): Promise<string>` - Compute SHA-256 hash of bytes
- `sha256_str(str: string): Promise<string>` - Compute SHA-256 hash of a UTF-8 string
- `hash` / `hash_str` - Aliases for keccak256 functions

### Prove Functions

- `prove_single_hash(dataHash: string): Promise<ProveSingleHashResponse>` - Prove a hash via Kayros API
- `prove_data(data: Uint8Array): Promise<ProveSingleHashResponse>` - Hash and prove bytes
- `prove_data_str(str: string): Promise<ProveSingleHashResponse>` - Hash and prove a string

### Record Functions

- `get_record_by_hash(recordHash: string): Promise<GetRecordResponse>` - Get Kayros record by hash

### Verify Function

- `verify<T>(envelope: KayrosEnvelope<T>): Promise<VerifyResult>` - Verify data against Kayros proof

## KayrosEnvelope

The `KayrosEnvelope` class wraps data with Kayros proof metadata:

```typescript
const envelope = new KayrosEnvelope(data, kayrosMetadata);

// Helper methods
envelope.getData();          // Get data as Uint8Array (decodes base64 for V0)
envelope.getDataHash();      // Get the data hash (data_item_hex)
envelope.getDataType();      // Get the data type (data_type_hex)
envelope.getKayrosHash();    // Get the Kayros hash (computed_hash_hex)
envelope.getTimeUUID();      // Get the time UUID (timeuuid_hex)
envelope.getHashAlgorithm(); // Get hash algorithm (defaults to 'sha256')
envelope.isV0();             // Check if V0 format (legacy, for email proofs)
```

### Envelope Formats

- **V1 (default)**: Hash stored in `kayros.hash`, data is plain string or object
- **V0 (legacy)**: Hash in `kayros.data.data_item_hex`, data is base64-encoded bytes (used for email proofs)

## Configuration

Default configuration:
- `KayrosHost`: `https://kayros.provable.dev`
- API Routes:
  - Single Hash: `/api/grpc/single-hash`
  - Get Record: `/api/database/record-by-hash`

## License

MIT

# Provable SDK for TypeScript/JavaScript

A TypeScript/JavaScript SDK for interacting with the Provable Kayros API.

## Installation

```bash
npm install provable-sdk-js
```

## Usage

### 1. Default usage

Use the SDK with no explicit API key and no custom data type. This uses the default `provable_sdk` data type and the built-in default key.

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

### 2. Usage with API key and custom data type

If your app has user settings for a private API key and a project-specific data type, pass them into the SDK before proving or verifying data.

```typescript
import {
  prove_single_hash,
  prove_data,
  get_record_by_hash,
  verify,
  KayrosEnvelope,
  setApiKey,
} from 'provable-sdk-js';

const settings = {
  apiKey: process.env.KAYROS_API_KEY!,
  dataType: 'kayros_indexer_v1',
};

// Optional: set the key once for subsequent calls.
setApiKey(settings.apiKey);

const proof = await prove_single_hash('your_hash_here', {
  apiKey: settings.apiKey,
  dataType: settings.dataType,
});

const dataProof = await prove_data(new TextEncoder().encode('hello'), {
  apiKey: settings.apiKey,
  dataType: settings.dataType,
});

const record = await get_record_by_hash('computed_hash_here', {
  apiKey: settings.apiKey,
  dataType: settings.dataType,
});

const envelope = new KayrosEnvelope('hello', {
  hash: 'local_data_hash',
  hashAlgorithm: 'keccak256',
  timestamp: {
    service: 'kayros',
    response: proof,
  },
});

const result = await verify(envelope, {
  apiKey: settings.apiKey,
  dataType: settings.dataType,
});
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
- `setApiKey(apiKey: string): void` - Set the API key used for subsequent requests

You can also pass request options directly:

- `prove_single_hash(dataHash, { apiKey, dataType })`
- `prove_data(data, { apiKey, dataType })`
- `prove_data_str(str, { apiKey, dataType })`

### Record Functions

- `get_record_by_hash(recordHash: string): Promise<GetRecordResponse>` - Get Kayros record by hash

Request options:

- `get_record_by_hash(recordHash, { apiKey, dataType })`
- Use `{ dataType: null }` to omit the `data_type` lookup query parameter when needed.

### Verify Function

- `verify<T>(envelope: KayrosEnvelope<T>): Promise<VerifyResult>` - Verify data against Kayros proof

Request options:

- `verify(envelope, { apiKey, dataType })`

## KayrosEnvelope

The `KayrosEnvelope` class wraps data with Kayros proof metadata:

```typescript
const envelope = new KayrosEnvelope(data, kayrosMetadata);

// Helper methods
envelope.getData();          // Get data as Uint8Array
envelope.getDataHash();      // Get the data hash (data_item_hex)
envelope.getDataType();      // Get the data type (data_type_hex)
envelope.getKayrosHash();    // Get the Kayros hash (computed_hash_hex)
envelope.getTimeUUID();      // Get the time UUID (timeuuid_hex)
envelope.getHashAlgorithm(); // Get hash algorithm (defaults to 'sha256')
```

## License

MIT

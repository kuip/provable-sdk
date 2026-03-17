# Provable SDK for TypeScript/JavaScript

`provable-sdk-js` is the Kayros API and verification SDK for TypeScript/JavaScript.

If you are working with Provable proof JSON envelopes, use [`provable-proof-js`](../provable-proof-js/README.md) alongside this package.

## Installation

```bash
npm install provable-sdk-js
```

## Usage

### 1. Default usage

Use the built-in key and the default `provable_sdk` data type.

```ts
import {
  prove_single_hash,
  get_record_by_hash,
  verify,
  verifyWithInclusion,
} from 'provable-sdk-js';

const dataItem = 'ab'.repeat(32);
const proof = await prove_single_hash(dataItem);
const kayrosHash = proof.data!.computed_hash_hex;

const record = await get_record_by_hash(kayrosHash);

const verified = await verify({
  data_type: 'provable_sdk',
  data_item: dataItem,
  kayros_hash: kayrosHash,
});

const inclusion = await verifyWithInclusion({
  data_type: 'provable_sdk',
  kayros_hash: kayrosHash,
});
```

### 2. Usage with API key and custom data type

If your app stores a user-specific private API key and custom `data_type`, pass them into each request or set the key globally.

```ts
import {
  prove_single_hash,
  verify,
  verifyWithInclusion,
  setApiKey,
} from 'provable-sdk-js';

const settings = {
  apiKey: process.env.KAYROS_API_KEY!,
  dataType: 'kayros_indexer_v1',
};

setApiKey(settings.apiKey);

const proof = await prove_single_hash('ab'.repeat(32), {
  apiKey: settings.apiKey,
  dataType: settings.dataType,
});

const kayrosHash = proof.data!.computed_hash_hex;

const verified = await verify({
  data_type: settings.dataType,
  data_item: 'ab'.repeat(32),
  kayros_hash: kayrosHash,
  apiKey: settings.apiKey,
});

const inclusion = await verifyWithInclusion({
  data_type: settings.dataType,
  kayros_hash: kayrosHash,
  apiKey: settings.apiKey,
  verify_batch_existence: true,
});
```

## Main API

- `prove_single_hash(dataHash, { apiKey?, dataType? })`
- `get_record_by_hash(kayrosHash, { apiKey?, dataType? })`
- `get_record_by_data_item({ data_type, data_item }, { apiKey? })`
- `get_merkle_proof({ data_type, hash }, { apiKey? })`
- `verify_hash_existence({ data_type, level, position, hash }, { apiKey? })`
- `verify_hash_batch({ data_type, level, start, hashes }, { apiKey? })`
- `verify({ data_type, data_item?, kayros_hash?, apiKey? })`
- `verifyWithInclusion({ data_type, data_item?, kayros_hash?, apiKey?, trusted_root_hash?, trusted_level?, trusted_position?, verify_batch_existence?, level_checks? })`

`data_type` is required for verification. Provide at least one of `data_item` or `kayros_hash`.

## Proof Envelopes

Proof JSON parsing and `KayrosEnvelope` live in [`provable-proof-js`](../provable-proof-js/README.md), not in this SDK package.

## License

MIT

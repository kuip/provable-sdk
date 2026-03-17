# @kuip/provable-proof

Proof envelope and proof-format helpers for Provable proofs in TypeScript/JavaScript.

This package owns the proof JSON envelope format used by Provable form, email, and web proofs. It depends on `@kuip/provable-sdk` for Kayros verification.

## Installation

```bash
npm install @kuip/provable-proof @kuip/provable-sdk
```

## Usage

### 1. Default usage

```ts
import { KayrosEnvelope, verifyEnvelopeWithInclusion } from '@kuip/provable-proof';

const envelope = KayrosEnvelope.fromJSON(proofJson);

const result = await verifyEnvelopeWithInclusion(envelope, {
  verify_batch_existence: true,
});
```

### 2. Usage with API key and custom data type

```ts
import { KayrosEnvelope, verifyEnvelope } from '@kuip/provable-proof';

const settings = {
  apiKey: process.env.KAYROS_API_KEY!,
  dataType: 'kayros_indexer_v1',
};

const envelope = KayrosEnvelope.fromJSON(proofJson);

const result = await verifyEnvelope(envelope, {
  apiKey: settings.apiKey,
  data_type: settings.dataType,
});
```

## API

- `KayrosEnvelope` parses and normalizes the proof envelope.
- `buildEnvelopeVerifyRequest(envelope)` converts the envelope into the SDK verification input.
- `verifyEnvelope(envelope, { apiKey?, data_type? })` verifies the envelope against Kayros records.
- `verifyEnvelopeWithInclusion(envelope, { apiKey?, data_type?, trusted_root_hash?, trusted_level?, trusted_position?, verify_batch_existence?, level_checks? })` also verifies the Merkle inclusion proof.

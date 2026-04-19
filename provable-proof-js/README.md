# @kuip/provable-proof

Proof envelope and proof-format helpers for Provable proofs in TypeScript/JavaScript.

This package owns the proof JSON envelope format used by Provable form, email, and web proofs. It depends on `@kuip/provable-sdk` for Kayros verification.

All proofs use the same JSON shape:

```json
{
  "data": "<base64 payload bytes>",
  "data_format": "web_form",
  "kayros": {
    "hash": "<hex data hash>",
    "hashAlgorithm": "SHA-256",
    "timestamp": {
      "service": "kayrosbot@0.0.2:prove_single_hash",
      "response": {}
    }
  }
}
```

`data` is always base64. For JSON payloads, encode the UTF-8 JSON bytes. For email or binary payloads, encode the raw bytes. `data_format` identifies how to decode/render the payload: `web_form`, `web_page`, `email`, or `""`. If it is empty or missing, consumers should fall back to payload introspection.

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

### 2. Creating proofs

```ts
import { KayrosEnvelope } from '@kuip/provable-proof';

const envelope = KayrosEnvelope.fromData(formProofData, kayrosData, 'web_form');
const proofJson = JSON.stringify(envelope, null, 2);
```

If `data` is already base64, use the constructor directly:

```ts
const envelope = new KayrosEnvelope(dataBase64, kayrosData, 'web_form');
```

### 3. Usage with API key and custom data type

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

## Proof Data Payloads

The top-level `data` field is always base64. Decode it based on `data_format` first, then fall back to payload introspection when `data_format` is empty or missing.

### `email`

Decoded data is the full raw email content, including headers.

### `web_form`

Decoded data is a JSON object:

```ts
type ProvableFormProofData = {
  id?: string;
  pageUrl?: string;
  form?: {
    formHtml?: string;
    data?: Record<string, unknown>;
    source?: string;
  };
  network?: {
    url?: string;
    method?: string;
    formData?: Record<string, unknown>;
  } | Array<Record<string, unknown>>;
};
```

### `web_page`

Decoded data is a JSON object whose fields are individually hashed sources:

```ts
type ProvableWebProofData = {
  meta?: { value: { url?: string; capturedAt?: string; proofLevel?: string | number }; hash: string };
  screenshot?: { value: string; hash: string };
  outerHTML?: { value: string; hash: string };
  fetchedHTML?: { value: string; hash: string };
  serverHTML?: { value: { body?: string; base64Encoded?: boolean }; hash: string };
  networkResponse?: { value: unknown; hash: string };
  networkRequests?: { value: unknown; hash: string };
  scripts?: { value: unknown; hash: string };
};
```

## API

- `KayrosEnvelope` parses and validates the proof envelope.
- `new KayrosEnvelope(dataBase64, kayros, dataFormat?)` creates an envelope from canonical proof data.
- `KayrosEnvelope.fromData(data, kayros, dataFormat?)` encodes raw JSON/text/bytes as base64 and creates an envelope.
- `envelope.getDataFormat()` returns `web_form`, `web_page`, `email`, or `""`.
- `envelope.getData()` returns decoded bytes.
- `envelope.getDataText()` returns decoded UTF-8 text.
- `envelope.parseData<T>()` parses decoded UTF-8 JSON payloads.
- `buildEnvelopeVerifyRequest(envelope)` converts the envelope into the SDK verification input.
- `verifyEnvelope(envelope, { apiKey?, data_type? })` verifies the envelope against Kayros records.
- `verifyEnvelopeWithInclusion(envelope, { apiKey?, data_type?, trusted_root_hash?, trusted_level?, trusted_position?, verify_batch_existence?, level_checks? })` also verifies the Merkle inclusion proof.

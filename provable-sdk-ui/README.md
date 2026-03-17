# @kuip/provable-ui

Reusable proof UI components for Provable/Kayros proofs.

`@kuip/provable-ui` expects proof envelopes from `@kuip/provable-proof`.

## React usage

```tsx
import { ProofViewer } from '@kuip/provable-ui';
import { KayrosEnvelope } from '@kuip/provable-proof';
import '@kuip/provable-ui/styles.css';

const envelope = new KayrosEnvelope(data, kayrosMetadata);

export function App() {
  return <ProofViewer envelope={envelope} theme="light" />;
}
```

## Data type routing

`ProofViewer` chooses a view based on `KayrosEnvelope.getDataTypeLabel()`:

- `provable_forms`: form snapshot view
- `provable_web`: web snapshot view
- `provable_email`: raw data view
- default (`provable_sdk`): raw data view

Legacy shape checks override the label:

- if `data.form` exists, use `provable_forms`
- if `data.outerHTML` or `data.scripts` exists, use `provable_web`

## Script tag usage

```html
<link rel="stylesheet" href="/path/to/@kuip/provable-ui/dist/style.css" />
<script src="/path/to/@kuip/provable-ui/dist/browser/@kuip/provable-ui.iife.js"></script>
<div id="proof-root"></div>
<script>
  const envelope = { data: window.proofData, kayros: window.kayrosMetadata };
  window.ProvableSdkUi.mountProofViewer(document.getElementById('proof-root'), {
    envelope,
    theme: 'dark'
  });
</script>
```

import React from 'react';
import { ProvableUiRoot } from './ProvableUiRoot';
import { VerificationPanel } from './VerificationPanel';
import { ProofDetailsPanel } from './ProofDetailsPanel';
import { DataContent } from './DataContent';
import { FormSnapshotPanel } from './FormSnapshotPanel';
import { WebSnapshotPanel } from './WebSnapshotPanel';
import { useKayrosVerification } from '../hooks/useKayrosVerification';
import { KayrosEnvelope } from 'provable-sdk-js';

export function ProofViewer({
  envelope,
  theme = 'light',
  showRemoteRecord = true
}: {
  envelope: KayrosEnvelope;
  theme?: string;
  showRemoteRecord?: boolean;
}) {
  const verification = useKayrosVerification(envelope);
  const dataTypeLabel = (envelope.getDataTypeLabel() || 'provable_sdk').toLowerCase();
  const data = envelope.data as any;
  const isObject = data && typeof data === 'object' && !Array.isArray(data);
  const hasFormPayload = isObject && 'form' in data;
  const hasWebPayload = isObject && ('outerHTML' in data || 'scripts' in data);

  let variant = dataTypeLabel;
  if (hasFormPayload) {
    variant = 'provable_forms';
  } else if (hasWebPayload) {
    variant = 'provable_web';
  }

  return (
    <ProvableUiRoot theme={theme}>
      <div className="pv-stack">
        <VerificationPanel verification={verification} />
        {variant === 'provable_forms' && <FormSnapshotPanel envelope={envelope} />}
        {variant === 'provable_web' && <WebSnapshotPanel envelope={envelope} />}
        {(variant === 'provable_email' || variant === 'provable_sdk') && (
          <DataContent envelope={envelope} title="Data" />
        )}
        <ProofDetailsPanel
          envelope={envelope}
          remoteRecord={verification.remoteRecord}
          showRemoteRecord={showRemoteRecord}
        />
      </div>
    </ProvableUiRoot>
  );
}

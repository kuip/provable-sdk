import React from 'react';
import { KayrosEnvelope } from 'provable-proof-js';
import type { GetRecordResponse } from 'provable-sdk-js';

export function ProofDetailsPanel({
  envelope,
  remoteRecord,
  title = 'Proof Details',
  showRemoteRecord = true
}: {
  envelope: KayrosEnvelope;
  remoteRecord?: GetRecordResponse;
  title?: string;
  showRemoteRecord?: boolean;
}) {
  const proofJson = JSON.stringify({
    data: envelope.data,
    kayros: envelope.kayros
  }, null, 2);

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">{title}</h2>
      <div className="pv-kv">
        <div className="pv-label">Full Proof JSON</div>
        <div className="pv-value">
          <textarea className="pv-textarea" readOnly value={proofJson} />
        </div>
      </div>

      {showRemoteRecord && remoteRecord && (
        <>
          <div className="pv-divider" />
          <div className="pv-kv">
            <div className="pv-label">Remote Timestamp Record</div>
            <div className="pv-value">
              <textarea
                className="pv-textarea"
                readOnly
                value={JSON.stringify(remoteRecord, null, 2)}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

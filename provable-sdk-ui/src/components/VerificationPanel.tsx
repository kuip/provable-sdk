import React from 'react';
import { useKayrosVerification, type VerificationState } from '../hooks/useKayrosVerification';
import { KayrosEnvelope } from 'provable-sdk-js';

export function VerificationPanel({
  envelope,
  verification,
  title = 'Verification'
}: {
  envelope?: KayrosEnvelope;
  verification?: VerificationState;
  title?: string;
}) {
  const hookVerification = useKayrosVerification(envelope);
  const resolvedVerification = verification ?? hookVerification;
  const normalized = envelope;

  if (!resolvedVerification || (!normalized && !verification)) {
    return null;
  }

  const {
    loading,
    error,
    hashMatch,
    computedHash,
    dataHash,
    remoteMatch,
    remoteRecord,
    remoteError,
    recordUrl,
    timestamp
  } = resolvedVerification;

  const dataHashLabel = normalized?.isV0() ? 'Envelope Hash (V0)' : 'Envelope Hash';

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">{title}</h2>
      {loading && <div className="pv-subtle">Verifying proof...</div>}
      {error && <div className="pv-error">{error}</div>}

      {!loading && !error && (
        <div>
          <div className="pv-kv">
            <div className="pv-label">Hash Match</div>
            <div className={`pv-value pv-status ${hashMatch ? 'match' : 'mismatch'}`}>
              {hashMatch ? 'Verified' : 'Mismatch'}
            </div>

            {computedHash && (
              <>
                <div className="pv-label">Computed Hash</div>
                <div className="pv-value">
                  <div className="pv-hash">{computedHash}</div>
                </div>
              </>
            )}

            {dataHash && (
              <>
                <div className="pv-label">{dataHashLabel}</div>
                <div className="pv-value">
                  <div className="pv-hash">{dataHash}</div>
                </div>
              </>
            )}

            {recordUrl && (
              <>
                <div className="pv-label">Timestamp Record</div>
                <div className="pv-value">
                  <a className="pv-link" href={recordUrl} target="_blank" rel="noreferrer">
                    View on Kayros
                  </a>
                </div>
              </>
            )}

            {remoteMatch !== undefined && (
              <>
                <div className="pv-label">Remote Verification</div>
                <div className={`pv-value pv-status ${remoteMatch ? 'match' : 'mismatch'}`}>
                  {remoteMatch ? 'Hash matches remote record' : 'Hash does not match remote'}
                </div>
              </>
            )}

            {(remoteRecord?.data?.data_item_hex || (remoteRecord as any)?.data_item_hex) && (
              <>
                <div className="pv-label">Remote Data Item</div>
                <div className="pv-value">
                  <div className="pv-hash">
                    {remoteRecord?.data?.data_item_hex ?? (remoteRecord as any)?.data_item_hex}
                  </div>
                </div>
              </>
            )}

            {timestamp && (
              <>
                <div className="pv-label">Timestamp</div>
                <div className="pv-value">{timestamp}</div>
              </>
            )}
          </div>

          {remoteError && <div className="pv-error">{remoteError}</div>}
        </div>
      )}
    </section>
  );
}

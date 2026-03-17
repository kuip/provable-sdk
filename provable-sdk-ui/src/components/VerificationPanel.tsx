import React from 'react';
import { useKayrosVerification, type VerificationState } from '../hooks/useKayrosVerification';
import { KayrosEnvelope } from '@kuip/provable-proof';

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
    timestampMatch,
    proofTimeuuid,
    remoteTimeuuid,
    remoteDataItemHex,
    remoteError,
    recordUrl,
    timestamp,
    timestampLocal
  } = resolvedVerification;

  const dataHashLabel = normalized?.isV0() ? 'Envelope Hash (V0)' : 'Envelope Hash';

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">{title}</h2>
      {loading && <div className="pv-subtle">Verifying proof...</div>}
      {error && <div className="pv-error">{error}</div>}

      {!loading && (
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

            {timestampMatch !== undefined && (
              <>
                <div className="pv-label">Remote Timestamp</div>
                <div className={`pv-value pv-status ${timestampMatch ? 'match' : 'mismatch'}`}>
                  {timestampMatch ? 'Timestamp matches remote record' : 'Timestamp does not match remote record'}
                </div>
              </>
            )}

            {timestampMatch === false && proofTimeuuid && (
              <>
                <div className="pv-label">Proof TimeUUID</div>
                <div className="pv-value">
                  <div className="pv-hash">{proofTimeuuid}</div>
                </div>
              </>
            )}

            {timestampMatch === false && remoteTimeuuid && (
              <>
                <div className="pv-label">Remote TimeUUID</div>
                <div className="pv-value">
                  <div className="pv-hash">{remoteTimeuuid}</div>
                </div>
              </>
            )}

            {remoteDataItemHex && (
              <>
                <div className="pv-label">Remote Data Item</div>
                <div className="pv-value">
                  <div className="pv-hash">
                    {remoteDataItemHex}
                  </div>
                </div>
              </>
            )}

            {timestamp && (
              <>
                <div className="pv-label">Timestamp</div>
                <div className="pv-value">
                  <div className="pv-hash">{timestamp}</div>
                  {timestampLocal && (
                    <div className="pv-subtle">Local time: {timestampLocal}</div>
                  )}
                </div>
              </>
            )}
          </div>

          {remoteError && <div className="pv-error">{remoteError}</div>}
        </div>
      )}
    </section>
  );
}

import React, { useEffect, useMemo, useRef } from 'react';
import { KayrosEnvelope } from '@kuip/provable-proof';
import { createFormSnapshotElement, getNetworkFormData, type FormSnapshotData } from '../formSnapshot';

export function FormSnapshotPanel({ envelope }: { envelope: KayrosEnvelope }) {
  const data = envelope.parseData<any>();
  const formHtml = data?.form?.formHtml as string | undefined;
  const formData = data?.form?.data ?? getNetworkFormData(data?.network) ?? {};
  const pageUrl = data?.pageUrl ?? data?.form?.source ?? data?.network?.url;

  const snapshotData = useMemo(() => {
    if (!formData || typeof formData !== 'object' || Array.isArray(formData)) {
      return {};
    }
    return formData;
  }, [formData]);

  const snapshotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = snapshotRef.current;
    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!formHtml) {
      container.textContent = 'No form HTML available';
      container.classList.add('pv-empty');
      return;
    }

    const snapshot = createFormSnapshotElement(formHtml, snapshotData as FormSnapshotData);
    container.classList.remove('pv-empty');
    container.appendChild(snapshot);
  }, [formHtml, snapshotData]);

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">Provable Form Snapshot</h2>
      {pageUrl && <div className="pv-subtle">{pageUrl}</div>}
      <div className="pv-form-snapshot" ref={snapshotRef} />
    </section>
  );
}

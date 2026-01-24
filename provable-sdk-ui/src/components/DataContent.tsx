import React from 'react';
import { KayrosEnvelope } from 'provable-sdk-js';

export function DataContent({
  envelope,
  title = 'Data'
}: {
  envelope: KayrosEnvelope;
  title?: string;
}) {
  let content = '';
  let error: string | undefined;

  try {
    content = new TextDecoder().decode(envelope.getData());
  } catch (err) {
    error = `Unable to decode envelope data: ${err instanceof Error ? err.message : String(err)}`;
  }

  return (
    <section className="pv-section">
      <h2 className="pv-section-title">{title}</h2>
      {error ? (
        <div className="pv-error">{error}</div>
      ) : (
        <div className="pv-scroll-box">{content}</div>
      )}
    </section>
  );
}

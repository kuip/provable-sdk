import React from 'react';
import { KayrosEnvelope } from 'provable-proof-js';

function tryDecodeBase64Text(value: string): string | undefined {
  const compact = value.trim().replace(/\s+/g, '');
  if (!compact || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(compact)) {
    return undefined;
  }

  const atobFn = typeof globalThis.atob === 'function' ? globalThis.atob.bind(globalThis) : undefined;
  if (!atobFn) {
    return undefined;
  }

  const normalized = compact.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);

  try {
    const binary = atobFn(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (!decoded) {
      return undefined;
    }

    let printable = 0;
    for (let i = 0; i < decoded.length; i += 1) {
      const code = decoded.charCodeAt(i);
      if (
        code === 9
        || code === 10
        || code === 13
        || (code >= 32 && code <= 126)
        || code >= 160
      ) {
        printable += 1;
      }
    }

    return printable / decoded.length > 0.85 ? decoded : undefined;
  } catch {
    return undefined;
  }
}

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
    if (typeof envelope.data === 'string') {
      content = tryDecodeBase64Text(envelope.data) ?? envelope.data;
    } else {
      content = new TextDecoder().decode(envelope.getData());
    }
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

export function normalizeLevelCounts(counts: number[], levels: number, proofLen: number): number[] | string {
  if (proofLen <= 0) {
    return 'empty proof path';
  }
  if (counts.length > 0) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    if (counts.some(count => count <= 0)) {
      return 'invalid level count';
    }
    if (total !== proofLen) {
      return 'proof length mismatch';
    }
    return counts;
  }
  if (levels <= 0 || levels === 1) {
    return [proofLen];
  }
  const remaining = proofLen - (256 * (levels - 1));
  if (remaining <= 0) {
    return 'proof length mismatch';
  }
  return [...Array.from({ length: levels - 1 }, () => 256), remaining];
}

export function normalizeHexString(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const bytes = decodeFlexibleBytes(value);
  return bytes ? bytesToHex(bytes) : undefined;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(value: string): Uint8Array {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

function decodeFlexibleBytes(value: string): Uint8Array | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const hexCandidate = trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  if (hexCandidate.length > 0 && hexCandidate.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(hexCandidate)) {
    return hexToBytes(hexCandidate);
  }

  const base64Bytes = decodeBase64(trimmed);
  if (base64Bytes) {
    return base64Bytes;
  }

  return undefined;
}

function decodeBase64(value: string): Uint8Array | undefined {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  try {
    const decoded = atob(normalized + padding);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

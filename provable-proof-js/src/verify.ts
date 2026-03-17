import {
  verify,
  verifyWithInclusion,
  type VerifyRequest,
  type VerifyWithInclusionRequest,
} from 'provable-sdk-js';
import { KayrosEnvelope } from './envelope';
import type {
  EnvelopeVerifyDetails,
  EnvelopeVerifyOverrides,
  EnvelopeVerifyResult,
  EnvelopeVerifyWithInclusionOverrides,
} from './types';

interface EnvelopeVerifyInput {
  request: VerifyRequest;
  details: Partial<EnvelopeVerifyDetails>;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function normalizeHexString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase().replace(/^0x/, '');
  if (!normalized || normalized.length % 2 !== 0 || !/^[0-9a-f]+$/.test(normalized)) {
    return undefined;
  }
  return normalized;
}

function invalidEnvelopeResult(
  details: Partial<EnvelopeVerifyDetails>,
  error: string,
): EnvelopeVerifyResult {
  return {
    valid: false,
    error,
    details: {
      lookupMode: details.envelopeKayrosHash ? 'kayros_hash' : 'data_item',
      recordFound: false,
      ...details,
    },
  };
}

export async function buildEnvelopeVerifyRequest(
  envelope: KayrosEnvelope,
  overrides: EnvelopeVerifyOverrides = {},
): Promise<EnvelopeVerifyInput> {
  const computedDataItem = normalizeHexString(await envelope.computeDataHash());
  const envelopeDataItem = normalizeHexString(envelope.getDataHash());
  const envelopeDataType = firstString(
    envelope.getDataType(),
    envelope.getDataTypeLabel(),
  );
  const envelopeKayrosHash = normalizeHexString(envelope.getKayrosHash());

  const request: VerifyRequest = {
    data_type: firstString(overrides.data_type, overrides.dataType, envelopeDataType),
    data_item: normalizeHexString(firstString(overrides.data_item, overrides.dataItem, computedDataItem)),
    kayros_hash: normalizeHexString(firstString(overrides.kayros_hash, overrides.kayrosHash, envelopeKayrosHash)),
    apiKey: firstString(overrides.apiKey, overrides.api_key, overrides.userKey),
  };

  return {
    request,
    details: {
      computedDataItem,
      envelopeDataItem,
      envelopeDataItemMatch: envelopeDataItem && computedDataItem ? envelopeDataItem === computedDataItem : undefined,
      envelopeDataType,
      envelopeKayrosHash,
    },
  };
}

export async function verifyEnvelope(
  envelope: KayrosEnvelope,
  overrides: EnvelopeVerifyOverrides = {},
): Promise<EnvelopeVerifyResult> {
  const input = await buildEnvelopeVerifyRequest(envelope, overrides);
  if (input.details.envelopeDataItem && input.details.envelopeDataItemMatch === false) {
    return invalidEnvelopeResult(
      input.details,
      `Envelope data_item mismatch: expected=${input.details.envelopeDataItem} computed=${input.details.computedDataItem}`,
    );
  }

  const result = await verify(input.request);
  return {
    valid: result.valid,
    error: result.error,
    details: result.details ? { ...result.details, ...input.details } : undefined,
  };
}

export async function verifyEnvelopeWithInclusion(
  envelope: KayrosEnvelope,
  overrides: EnvelopeVerifyWithInclusionOverrides = {},
): Promise<EnvelopeVerifyResult> {
  const input = await buildEnvelopeVerifyRequest(envelope, overrides);
  if (input.details.envelopeDataItem && input.details.envelopeDataItemMatch === false) {
    return invalidEnvelopeResult(
      input.details,
      `Envelope data_item mismatch: expected=${input.details.envelopeDataItem} computed=${input.details.computedDataItem}`,
    );
  }

  const request: VerifyWithInclusionRequest = {
    ...input.request,
    trusted_root_hash: firstString(overrides.trusted_root_hash, overrides.trustedRootHash),
    trusted_level: overrides.trusted_level ?? overrides.trustedLevel,
    trusted_position: overrides.trusted_position ?? overrides.trustedPosition,
    verify_batch_existence: overrides.verify_batch_existence ?? overrides.verifyBatchExistence,
    level_checks: overrides.level_checks ?? overrides.levelChecks,
  };

  const result = await verifyWithInclusion(request);
  return {
    valid: result.valid,
    error: result.error,
    details: result.details ? { ...result.details, ...input.details } : undefined,
  };
}

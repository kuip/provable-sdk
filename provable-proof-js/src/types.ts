import type {
  VerifyLevelCheck,
  VerifyResult,
} from 'provable-sdk-js';

export interface KayrosMetadata {
  hash?: string;
  hashAlgorithm?: string;
  timestamp?: {
    service: string;
    response: unknown;
  };
}

export interface KayrosMetadataV0 {
  success: boolean;
  message?: string;
  data?: {
    success: boolean;
    message: string;
    data_type: string;
    data_item: string;
    computed_hash_hex: string;
    timeuuid_hex: string;
    data_type_hex: string;
    data_item_hex: string;
  };
  error?: string;
  hash?: string;
  hashAlgorithm?: string;
}

export type AnyKayrosMetadata = KayrosMetadata | KayrosMetadataV0;

export interface EnvelopeVerifyOverrides {
  data_type?: string;
  dataType?: string;
  data_item?: string;
  dataItem?: string;
  kayros_hash?: string;
  kayrosHash?: string;
  apiKey?: string;
  api_key?: string;
  userKey?: string;
}

export interface EnvelopeVerifyWithInclusionOverrides extends EnvelopeVerifyOverrides {
  trusted_root_hash?: string;
  trustedRootHash?: string;
  trusted_level?: number;
  trustedLevel?: number;
  trusted_position?: number;
  trustedPosition?: number;
  verify_batch_existence?: boolean;
  verifyBatchExistence?: boolean;
  level_checks?: VerifyLevelCheck[];
  levelChecks?: VerifyLevelCheck[];
}

export type EnvelopeVerifyDetails = NonNullable<VerifyResult['details']> & {
  computedDataItem?: string;
  envelopeDataItem?: string;
  envelopeDataItemMatch?: boolean;
  envelopeDataType?: string;
  envelopeKayrosHash?: string;
};

export interface EnvelopeVerifyResult {
  valid: boolean;
  error?: string;
  details?: EnvelopeVerifyDetails;
}

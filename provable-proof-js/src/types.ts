import type {
  GetRecordResponse,
  ProveSingleHashResponse,
  VerifyLevelCheck,
  VerifyResult,
} from '@kuip/provable-sdk';

export interface KayrosTimestampResponse {
  success: boolean;
  response?: ProveSingleHashResponse;
  data?: GetRecordResponse;
  message?: string;
  error?: string;
}

export interface KayrosData {
  hash?: string;
  hashAlgorithm?: string;
  timestamp?: {
    service: string;
    response: KayrosTimestampResponse;
  };
}

export type KayrosMetadata = KayrosData;

export type ProofDataFormat =
  | 'web_form'
  | 'web_page'
  | 'email'
  | 'raw_data'
  | 'raw_hash'
  | ''
  | (string & {});

export interface KayrosProof {
  data: string;
  data_format?: ProofDataFormat;
  kayros: KayrosData;
}

export type ProvableEmailProofData = string;

export interface ProvableFormProofData {
  id?: string;
  pageUrl?: string;
  form?: {
    formHtml?: string;
    data?: Record<string, unknown>;
    source?: string;
    [key: string]: unknown;
  };
  network?: {
    url?: string;
    method?: string;
    formData?: Record<string, unknown>;
    [key: string]: unknown;
  } | Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ProvableWebProofSource<T = unknown> {
  value: T;
  hash: string;
}

export interface ProvableWebProofData {
  meta?: ProvableWebProofSource<{
    url?: string;
    capturedAt?: string;
    proofLevel?: string | number;
    [key: string]: unknown;
  }>;
  screenshot?: ProvableWebProofSource<string>;
  outerHTML?: ProvableWebProofSource<string>;
  fetchedHTML?: ProvableWebProofSource<string>;
  serverHTML?: ProvableWebProofSource<{
    body?: string;
    base64Encoded?: boolean;
    [key: string]: unknown;
  }>;
  networkResponse?: ProvableWebProofSource<unknown>;
  networkRequests?: ProvableWebProofSource<unknown>;
  scripts?: ProvableWebProofSource<unknown>;
  [key: string]: ProvableWebProofSource<unknown> | undefined;
}

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

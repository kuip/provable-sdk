/**
 * Public request/verification option types.
 */

export interface ApiKeyOptions {
  apiKey?: string;
  userKey?: string;
}

export interface ProveOptions extends ApiKeyOptions {
  dataType?: string;
}

export interface RecordLookupOptions extends ApiKeyOptions {
  dataType?: string | null;
}

export interface VerifyOptions extends ApiKeyOptions {
  dataType?: string | string[] | null;
}

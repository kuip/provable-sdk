package provable

import "strings"

// KayrosTimestamp represents a timestamp from the Kayros service
type KayrosTimestamp struct {
	Service  string      `json:"service"`
	Response interface{} `json:"response"`
}

// KayrosMetadataV0Data represents the data field in V0 format (from APIResponse)
type KayrosMetadataV0Data struct {
	DataItemHex     string `json:"data_item_hex,omitempty"`
	ComputedHashHex string `json:"computed_hash_hex,omitempty"`
	DataType        string `json:"data_type,omitempty"`
	DataTypeHex     string `json:"data_type_hex,omitempty"`
	Message         string `json:"message,omitempty"`
	Success         bool   `json:"success,omitempty"`
	TimeuuidHex     string `json:"timeuuid_hex,omitempty"`
}

// KayrosMetadata represents metadata attached to Kayros envelopes (supports both V0 and V1 formats)
type KayrosMetadata struct {
	// V1 format fields
	Hash          string           `json:"hash,omitempty"`
	HashAlgorithm string           `json:"hashAlgorithm,omitempty"`
	Timestamp     *KayrosTimestamp `json:"timestamp,omitempty"`
	// V0 format fields (APIResponse-based)
	Success bool                  `json:"success,omitempty"`
	Message string                `json:"message,omitempty"`
	Data    *KayrosMetadataV0Data `json:"data,omitempty"`
	Error   string                `json:"error,omitempty"`
}

// KayrosEnvelope wraps data with Kayros metadata
type KayrosEnvelope struct {
	Data   interface{}    `json:"data"`
	Kayros KayrosMetadata `json:"kayros"`
}

// GetDataHash returns the data hash (data_item_hex) from the metadata
func (e *KayrosEnvelope) GetDataHash() string {
	// V1 format: hash is directly on metadata
	if e.Kayros.Hash != "" {
		return e.Kayros.Hash
	}
	// V0 format: hash is in data.data_item_hex
	if e.Kayros.Data != nil && e.Kayros.Data.DataItemHex != "" {
		return e.Kayros.Data.DataItemHex
	}
	return ""
}

// GetDataType returns the data type (data_type_hex) from the metadata
func (e *KayrosEnvelope) GetDataType() string {
	if e.Kayros.Data != nil && e.Kayros.Data.DataTypeHex != "" {
		return e.Kayros.Data.DataTypeHex
	}
	return ""
}

// GetKayrosHash returns the Kayros hash (computed_hash_hex) from the metadata
func (e *KayrosEnvelope) GetKayrosHash() string {
	if e.Kayros.Data != nil && e.Kayros.Data.ComputedHashHex != "" {
		return e.Kayros.Data.ComputedHashHex
	}
	return ""
}

// GetTimeUUID returns the time UUID (timeuuid_hex) from the metadata
func (e *KayrosEnvelope) GetTimeUUID() string {
	if e.Kayros.Data != nil && e.Kayros.Data.TimeuuidHex != "" {
		return e.Kayros.Data.TimeuuidHex
	}
	return ""
}

// GetHashAlgorithm returns the hash algorithm (normalized to lowercase, defaults to sha256)
func (e *KayrosEnvelope) GetHashAlgorithm() string {
	algorithm := e.Kayros.HashAlgorithm
	if algorithm == "" {
		return "sha256"
	}
	return strings.ToLower(algorithm)
}

// IsV0 checks if this is the V0 format (legacy, used only for email proofs).
// V0 envelopes have base64-encoded data that must be decoded before hashing.
func (e *KayrosEnvelope) IsV0() bool {
	return e.Kayros.Hash == "" && e.Kayros.Data != nil && e.Kayros.Data.DataItemHex != ""
}

// ProveSingleHashResponseData contains the computed hash from Kayros
type ProveSingleHashResponseData struct {
	ComputedHashHex string                 `json:"computed_hash_hex"`
	Extra           map[string]interface{} `json:"-"`
}

// ProveSingleHashResponse is the response from the prove single hash API
type ProveSingleHashResponse struct {
	Data ProveSingleHashResponseData `json:"data"`
}

// GetRecordResponseData contains the record data from Kayros
type GetRecordResponseData struct {
	DataItemHex string                 `json:"data_item_hex"`
	Timestamp   string                 `json:"timestamp,omitempty"`
	Extra       map[string]interface{} `json:"-"`
}

// GetRecordResponse is the response from the get record by hash API
type GetRecordResponse struct {
	Data GetRecordResponseData `json:"data"`
}

// VerifyResultDetails contains detailed information about the verification
type VerifyResultDetails struct {
	HashMatch    bool   `json:"hashMatch,omitempty"`
	RemoteMatch  bool   `json:"remoteMatch,omitempty"`
	ComputedHash string `json:"computedHash,omitempty"`
	DataHash     string `json:"dataHash,omitempty"`
	RemoteHash   string `json:"remoteHash,omitempty"`
}

// VerifyResult represents the result of a verification operation
type VerifyResult struct {
	Valid   bool                 `json:"valid"`
	Error   string               `json:"error,omitempty"`
	Details *VerifyResultDetails `json:"details,omitempty"`
}

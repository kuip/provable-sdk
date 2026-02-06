package provable

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
)

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

// GetDataTypeLabel returns the decoded data type label from data_type_hex.
func (e *KayrosEnvelope) GetDataTypeLabel() string {
	dataTypeHex := e.GetDataType()
	if dataTypeHex == "" {
		return ""
	}

	normalized := strings.TrimPrefix(dataTypeHex, "0x")
	if len(normalized) == 0 || len(normalized)%2 != 0 {
		return ""
	}

	decoded, err := hex.DecodeString(normalized)
	if err != nil {
		return ""
	}

	return string(decoded)
}

// GetKayrosHash returns the Kayros hash (computed_hash_hex) from the metadata
func (e *KayrosEnvelope) GetKayrosHash() string {
	if e.Kayros.Data != nil && e.Kayros.Data.ComputedHashHex != "" {
		return e.Kayros.Data.ComputedHashHex
	}
	if e.Kayros.Timestamp != nil && e.Kayros.Timestamp.Response != nil {
		switch response := e.Kayros.Timestamp.Response.(type) {
		case map[string]interface{}:
			if value, ok := response["hash"].(string); ok && value != "" {
				return value
			}
			if data, ok := response["data"].(map[string]interface{}); ok {
				if value, ok := data["computed_hash_hex"].(string); ok && value != "" {
					return value
				}
			}
		case ProveSingleHashResponse:
			if response.Hash != "" {
				return response.Hash
			}
		case *ProveSingleHashResponse:
			if response != nil && response.Hash != "" {
				return response.Hash
			}
		}
	}
	return ""
}

// GetTimeUUID returns the time UUID (timeuuid_hex) from the metadata
func (e *KayrosEnvelope) GetTimeUUID() string {
	if e.Kayros.Data != nil && e.Kayros.Data.TimeuuidHex != "" {
		return e.Kayros.Data.TimeuuidHex
	}
	if e.Kayros.Timestamp != nil && e.Kayros.Timestamp.Response != nil {
		if response, ok := e.Kayros.Timestamp.Response.(map[string]interface{}); ok {
			if value, ok := response["timeuuid"].(string); ok && value != "" {
				return value
			}
			if data, ok := response["data"].(map[string]interface{}); ok {
				if value, ok := data["timeuuid_hex"].(string); ok && value != "" {
					return value
				}
			}
		}
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

// GetData returns the data as bytes.
// For V0 (legacy email proofs): decodes base64 data to bytes.
// For V1: stringifies objects to JSON and encodes as UTF-8 bytes.
func (e *KayrosEnvelope) GetData() ([]byte, error) {
	if e.IsV0() {
		// V0 format: data is base64 encoded
		dataStr, ok := e.Data.(string)
		if !ok {
			return nil, fmt.Errorf("V0 envelope data must be a base64 string")
		}
		return base64.StdEncoding.DecodeString(dataStr)
	}

	// V1 format: stringify objects to JSON, encode as UTF-8
	if str, ok := e.Data.(string); ok {
		return []byte(str), nil
	}
	return json.Marshal(e.Data)
}

// ComputeDataHash computes the data hash using the envelope hash algorithm.
func (e *KayrosEnvelope) ComputeDataHash() (string, error) {
	data, err := e.GetData()
	if err != nil {
		return "", err
	}

	algorithm := e.GetHashAlgorithm()
	if algorithm == "keccak256" || algorithm == "keccak-256" {
		return Keccak256(data), nil
	}

	return SHA256(data), nil
}

// ProveSingleHashResponse is the response from the prove single hash API
type ProveSingleHashResponse struct {
	Success  bool   `json:"success"`
	Hash     string `json:"hash,omitempty"`
	TimeUUID string `json:"timeuuid,omitempty"`
	Encoding string `json:"encoding,omitempty"`
	Error    string `json:"error,omitempty"`
}

// GetRecordResponse is the response from the get record by hash API
type GetRecordResponse struct {
	DataItemHex string `json:"data_item_hex,omitempty"`
	DataItem    string `json:"data_item"`
	DataType    string `json:"data_type"`
	HashItem    string `json:"hash_item"`
	HashType    string `json:"hash_type"`
	Position    int64  `json:"position"`
	PrevHash    string `json:"prev_hash,omitempty"`
	Ts          string `json:"ts"`
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

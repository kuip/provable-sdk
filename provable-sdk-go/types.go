package provable

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"regexp"
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
	Data        interface{}    `json:"data"`
	Kayros      KayrosMetadata `json:"kayros"`
	RawDataJSON string         `json:"-"`
}

var hexPattern = regexp.MustCompile(`^[0-9a-fA-F]+$`)

// ParseEnvelopeJSON parses a proof JSON payload and preserves the original top-level
// "data" JSON bytes so hashing can match producer-side byte representation.
func ParseEnvelopeJSON(payload []byte) (*KayrosEnvelope, error) {
	var parsed map[string]json.RawMessage
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return nil, fmt.Errorf("invalid proof JSON: %w", err)
	}

	rawData, hasData := parsed["data"]
	rawKayros, hasKayros := parsed["kayros"]
	if !hasData || !hasKayros {
		return nil, fmt.Errorf(`invalid proof JSON: expected { "data": ..., "kayros": ... }`)
	}

	var data interface{}
	if err := json.Unmarshal(rawData, &data); err != nil {
		return nil, fmt.Errorf("invalid proof JSON data field: %w", err)
	}

	var kayros KayrosMetadata
	if err := json.Unmarshal(rawKayros, &kayros); err != nil {
		return nil, fmt.Errorf("invalid proof JSON kayros field: %w", err)
	}

	return &KayrosEnvelope{
		Data:        data,
		Kayros:      kayros,
		RawDataJSON: string(rawData),
	}, nil
}

func normalizeHashAlgorithm(value string) string {
	if value == "" {
		return "sha256"
	}
	normalized := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(value, "_", ""), "-", ""))
	if normalized == "keccak256" {
		return "keccak256"
	}
	return "sha256"
}

func decodeHexString(value string) string {
	normalized := strings.TrimPrefix(value, "0x")
	if normalized == "" || len(normalized)%2 != 0 || !hexPattern.MatchString(normalized) {
		return ""
	}
	decoded, err := hex.DecodeString(normalized)
	if err != nil {
		return ""
	}
	return string(decoded)
}

func mapFromInterface(value interface{}) map[string]interface{} {
	switch typed := value.(type) {
	case map[string]interface{}:
		return typed
	case nil:
		return nil
	default:
		raw, err := json.Marshal(typed)
		if err != nil {
			return nil
		}
		var out map[string]interface{}
		if err := json.Unmarshal(raw, &out); err != nil {
			return nil
		}
		return out
	}
}

func getPath(root map[string]interface{}, path ...string) interface{} {
	current := interface{}(root)
	for _, segment := range path {
		node, ok := current.(map[string]interface{})
		if !ok {
			return nil
		}
		next, ok := node[segment]
		if !ok {
			return nil
		}
		current = next
	}
	return current
}

func getPathString(root map[string]interface{}, path ...string) string {
	value := getPath(root, path...)
	if str, ok := value.(string); ok && str != "" {
		return str
	}
	return ""
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func (e *KayrosEnvelope) timestampResponseMap() map[string]interface{} {
	if e.Kayros.Timestamp == nil {
		return nil
	}
	return mapFromInterface(e.Kayros.Timestamp.Response)
}

func (e *KayrosEnvelope) registerResponseMap() map[string]interface{} {
	timestamp := e.timestampResponseMap()
	if timestamp == nil {
		return nil
	}
	if nested, ok := getPath(timestamp, "response").(map[string]interface{}); ok && nested != nil {
		return nested
	}
	return timestamp
}

func (e *KayrosEnvelope) metadataKind() string {
	if e.timestampResponseMap() != nil {
		return "timestamp_v1"
	}
	if e.Kayros.Data != nil {
		return "legacy_v0"
	}
	return "unknown"
}

// GetDataHash returns the data hash (data_item_hex) from the metadata
func (e *KayrosEnvelope) GetDataHash() string {
	register := e.registerResponseMap()
	timestamp := e.timestampResponseMap()
	return firstNonEmpty(
		e.Kayros.Hash,
		getPathString(register, "data_item_hex"),
		getPathString(register, "data", "data_item_hex"),
		getPathString(timestamp, "data", "data_item_hex"),
		func() string {
			if e.Kayros.Data != nil {
				return e.Kayros.Data.DataItemHex
			}
			return ""
		}(),
	)
}

// GetDataType returns the data type from metadata.
// For timestamp responses this prefers raw data_type, and falls back to decoded
// data_type_hex when needed.
func (e *KayrosEnvelope) GetDataType() string {
	register := e.registerResponseMap()
	timestamp := e.timestampResponseMap()
	raw := firstNonEmpty(
		getPathString(register, "data_type"),
		getPathString(register, "data", "data_type"),
		getPathString(timestamp, "data", "data_type"),
	)
	if raw != "" {
		return raw
	}
	hexValue := firstNonEmpty(
		getPathString(register, "data_type_hex"),
		getPathString(register, "data", "data_type_hex"),
		getPathString(timestamp, "data", "data_type_hex"),
		func() string {
			if e.Kayros.Data != nil {
				return e.Kayros.Data.DataTypeHex
			}
			return ""
		}(),
	)
	if hexValue == "" {
		return ""
	}
	decoded := decodeHexString(hexValue)
	if decoded != "" {
		return decoded
	}
	return hexValue
}

// GetDataTypeLabel returns a human-readable data type.
// If value is hex, it decodes it; otherwise it returns the original value.
func (e *KayrosEnvelope) GetDataTypeLabel() string {
	dataType := e.GetDataType()
	if dataType == "" {
		return ""
	}
	if decoded := decodeHexString(dataType); decoded != "" {
		return decoded
	}
	return dataType
}

// GetDataTypeLookupCandidates returns candidate values to use when querying
// Kayros records by data_type, ordered from most exact to most relaxed.
func (e *KayrosEnvelope) GetDataTypeLookupCandidates() []string {
	register := e.registerResponseMap()
	timestamp := e.timestampResponseMap()
	raw := firstNonEmpty(
		getPathString(register, "data_type"),
		getPathString(register, "data", "data_type"),
		getPathString(timestamp, "data", "data_type"),
	)
	decodedRaw := decodeHexString(raw)
	dataType := e.GetDataType()
	decodedDataType := decodeHexString(dataType)
	label := e.GetDataTypeLabel()
	return uniqueStrings([]string{raw, decodedRaw, dataType, decodedDataType, label})
}

// GetKayrosHash returns the Kayros hash (computed_hash_hex) from the metadata
func (e *KayrosEnvelope) GetKayrosHash() string {
	register := e.registerResponseMap()
	timestamp := e.timestampResponseMap()
	return firstNonEmpty(
		func() string {
			if e.Kayros.Data != nil {
				return e.Kayros.Data.ComputedHashHex
			}
			return ""
		}(),
		getPathString(timestamp, "data", "computed_hash_hex"),
		getPathString(register, "data", "computed_hash_hex"),
		getPathString(register, "computed_hash_hex"),
		getPathString(register, "hash"),
	)
}

// GetTimeUUID returns the time UUID (timeuuid_hex) from the metadata
func (e *KayrosEnvelope) GetTimeUUID() string {
	register := e.registerResponseMap()
	timestamp := e.timestampResponseMap()
	return firstNonEmpty(
		getPathString(register, "data", "timeuuid_hex"),
		getPathString(register, "timeuuid_hex"),
		getPathString(register, "data", "timeuuid"),
		getPathString(register, "timeuuid"),
		getPathString(timestamp, "data", "timeuuid_hex"),
		getPathString(timestamp, "data", "timeuuid"),
		func() string {
			if e.Kayros.Data != nil {
				return e.Kayros.Data.TimeuuidHex
			}
			return ""
		}(),
	)
}

// GetHashAlgorithm returns the hash algorithm (normalized to lowercase, defaults to sha256)
func (e *KayrosEnvelope) GetHashAlgorithm() string {
	return normalizeHashAlgorithm(e.Kayros.HashAlgorithm)
}

// IsV0 checks if this is the V0 format (legacy, used only for email proofs).
// V0 envelopes have base64-encoded data that must be decoded before hashing.
func (e *KayrosEnvelope) IsV0() bool {
	return e.metadataKind() == "legacy_v0" && e.Kayros.Hash == "" && e.Kayros.Data != nil && e.Kayros.Data.DataItemHex != ""
}

func decodeBase64String(value string) ([]byte, error) {
	if decoded, err := base64.StdEncoding.DecodeString(value); err == nil {
		return decoded, nil
	}
	return base64.URLEncoding.DecodeString(value)
}

func addBytesCandidate(candidates *[][]byte, seen map[string]struct{}, value []byte) {
	if len(value) == 0 {
		return
	}
	key := hex.EncodeToString(value)
	if _, ok := seen[key]; ok {
		return
	}
	seen[key] = struct{}{}
	*candidates = append(*candidates, value)
}

func (e *KayrosEnvelope) primaryDataBytes() ([]byte, error) {
	if str, ok := e.Data.(string); ok {
		if e.IsV0() {
			decoded, err := decodeBase64String(str)
			if err == nil {
				return decoded, nil
			}
		}
		return []byte(str), nil
	}

	if e.RawDataJSON != "" {
		return []byte(e.RawDataJSON), nil
	}
	return json.Marshal(e.Data)
}

func (e *KayrosEnvelope) dataCandidates() ([][]byte, error) {
	candidates := make([][]byte, 0, 4)
	seen := make(map[string]struct{})

	if str, ok := e.Data.(string); ok {
		utf8 := []byte(str)
		decoded, decodeErr := decodeBase64String(str)
		if e.IsV0() {
			if decodeErr == nil {
				addBytesCandidate(&candidates, seen, decoded)
			}
			addBytesCandidate(&candidates, seen, utf8)
		} else {
			addBytesCandidate(&candidates, seen, utf8)
			if decodeErr == nil {
				addBytesCandidate(&candidates, seen, decoded)
			}
		}
		return candidates, nil
	}

	if e.RawDataJSON != "" {
		addBytesCandidate(&candidates, seen, []byte(e.RawDataJSON))
	}

	marshaled, err := json.Marshal(e.Data)
	if err != nil {
		return nil, err
	}
	addBytesCandidate(&candidates, seen, marshaled)
	return candidates, nil
}

// GetData returns the primary data byte representation used for hashing.
func (e *KayrosEnvelope) GetData() ([]byte, error) {
	return e.primaryDataBytes()
}

func hashWithAlgorithm(data []byte, algorithm string) string {
	if algorithm == "keccak256" {
		return Keccak256(data)
	}
	return SHA256(data)
}

// ComputeDataHash computes the data hash using the envelope hash algorithm.
func (e *KayrosEnvelope) ComputeDataHash() (string, error) {
	preferred := e.GetHashAlgorithm()
	alternate := "keccak256"
	if preferred == "keccak256" {
		alternate = "sha256"
	}

	expected := strings.ToLower(e.GetDataHash())
	candidates, err := e.dataCandidates()
	if err != nil {
		return "", err
	}
	if expected != "" {
		for _, candidate := range candidates {
			preferredHash := hashWithAlgorithm(candidate, preferred)
			if strings.EqualFold(preferredHash, expected) {
				return preferredHash, nil
			}
			alternateHash := hashWithAlgorithm(candidate, alternate)
			if strings.EqualFold(alternateHash, expected) {
				return alternateHash, nil
			}
		}
	}

	primary, err := e.primaryDataBytes()
	if err != nil {
		return "", err
	}
	return hashWithAlgorithm(primary, preferred), nil
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

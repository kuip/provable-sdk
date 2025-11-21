package provable

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// Database types

type DatabaseQuery struct {
	DataType     *string `json:"data_type,omitempty"`
	HashType     *string `json:"hash_type,omitempty"`
	MinTimestamp *string `json:"min_timestamp,omitempty"`
	MaxTimestamp *string `json:"max_timestamp,omitempty"`
	Limit        int     `json:"limit"`
	Offset       int     `json:"offset"`
	OrderBy      string  `json:"order_by"` // ts_asc or ts_desc
}

type HashRecord struct {
	Timestamp string `json:"timestamp"`
	DataType  string `json:"data_type"`
	DataItem  string `json:"data_item"` // base64 or hex
	HashType  string `json:"hash_type"`
	HashItem  string `json:"hash_item"` // base64 or hex
}

type DatabaseStats struct {
	TotalHashes    int64             `json:"total_hashes"`
	CountByType    map[string]int64  `json:"count_by_type"`
	MinTimestamp   string            `json:"min_timestamp"`
	MaxTimestamp   string            `json:"max_timestamp"`
	TimestampRange string            `json:"timestamp_range"`
}

type ColumnInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type TableBrowseRequest struct {
	TableName    string `json:"table_name"`
	Offset       int    `json:"offset"`
	Limit        int    `json:"limit"`
	OrderBy      string `json:"order_by,omitempty"`
	SearchTerm   string `json:"search_term,omitempty"`
	SearchColumn string `json:"search_column,omitempty"`
}

type DatabaseRecord struct {
	DataType    string `json:"data_type"`
	DataItemHex string `json:"data_item_hex"`
	UUIDHex     string `json:"uuid_hex"`
	HashItemHex string `json:"hash_item_hex"`
	PrevHashHex string `json:"prev_hash_hex,omitempty"`
	HashType    string `json:"hash_type"`
	Timestamp   string `json:"timestamp"`
}

// Hash verification types

type HashVerifyRequest struct {
	PrevHash string `json:"prev_hash"` // hex
	DataType string `json:"data_type"`
	DataItem string `json:"data_item"` // hex
	UUID     string `json:"uuid"`      // hex
	HashType string `json:"hash_type"` // blake3 or xxh3
}

type HashVerifyResult struct {
	ComputedHash string `json:"computed_hash"` // hex
	HashInputHex string `json:"hash_input_hex"`
}

type ComputeHashRequest struct {
	HashInputHex string `json:"hash_input_hex"`
	HashType     string `json:"hash_type"` // blake3 or xxh3
}

// gRPC types

type SingleHashRequest struct {
	DataType string `json:"data_type"` // 64 hex chars (32 bytes)
	DataItem string `json:"data_item"` // 64 hex chars (32 bytes)
}

type SingleHashResponse struct {
	Success        bool   `json:"success"`
	Message        string `json:"message"`
	DataType       string `json:"data_type"`
	DataItem       string `json:"data_item"`
	ComputedHashHex string `json:"computed_hash_hex"`
	TimeuuidHex    string `json:"timeuuid_hex"`
	DataTypeHex    string `json:"data_type_hex"`
	DataItemHex    string `json:"data_item_hex"`
}

// Merkle proof types

type GenerateMerkleProofRequest struct {
	HashItem  string `json:"hash_item"`
	DataType  string `json:"data_type,omitempty"`
	Timestamp string `json:"timestamp,omitempty"`
}

type MerkleProof struct {
	TargetHashHex   string   `json:"target_hash_hex"`
	DataType        string   `json:"data_type"`
	Timestamp       string   `json:"timestamp"`
	Position        int64    `json:"position"`
	RootHashHex     string   `json:"root_hash_hex"`
	ProofHashesHex  []string `json:"proof_hashes_hex"`
	Levels          int      `json:"levels"`
	StoredRootHex   string   `json:"stored_root_hex"`
	GeneratedAt     string   `json:"generated_at"`
	LightnetVersion string   `json:"lightnet_version"`
	ProofFormat     string   `json:"proof_format"`
}

type VerifyMerkleProofRequest struct {
	TargetHashHex  string   `json:"target_hash_hex"`
	ProofHashesHex []string `json:"proof_hashes_hex"` // must be 256 entries
	Levels         int      `json:"levels"`
	Position       int64    `json:"position"`
	RootHashHex    string   `json:"root_hash_hex"`
}

type MerkleProofVerificationResult struct {
	Valid           bool   `json:"valid"`
	Message         string `json:"message"`
	ComputedRootHex string `json:"computed_root_hex"`
	StoredRootHex   string `json:"stored_root_hex"`
	TargetHashHex   string `json:"target_hash_hex"`
	Position        int64  `json:"position"`
}

// API Response wrapper

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Database Operations

// QueryHashes queries hash records from the database
func QueryHashes(query DatabaseQuery) (*APIResponse, error) {
	url := GetKayrosURL("/api/database/query")

	jsonData, err := json.Marshal(query)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal query: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetDatabaseStats gets database statistics
func GetDatabaseStats() (*APIResponse, error) {
	url := GetKayrosURL("/api/database/stats")

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetLatestHashes gets the most recent hash records
func GetLatestHashes(limit int) (*APIResponse, error) {
	url := GetKayrosURL(fmt.Sprintf("/api/database/latest?limit=%d", limit))

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetTables gets all database tables
func GetTables() (*APIResponse, error) {
	url := GetKayrosURL("/api/database/tables")

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetTableSchema gets schema for a specific table
func GetTableSchema(tableName string) (*APIResponse, error) {
	url := GetKayrosURL(fmt.Sprintf("/api/database/schema?table=%s", url.QueryEscape(tableName)))

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// BrowseTable browses table data with pagination
func BrowseTable(request TableBrowseRequest) (*APIResponse, error) {
	url := GetKayrosURL("/api/database/browse")

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetRecord gets a record by UUID
func GetRecord(uuid string) (*APIResponse, error) {
	url := GetKayrosURL(fmt.Sprintf("/api/database/record?uuid=%s", url.QueryEscape(uuid)))

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetRecordWithPrevHash gets a record by UUID with previous hash
func GetRecordWithPrevHash(uuid string) (*APIResponse, error) {
	url := GetKayrosURL(fmt.Sprintf("/api/database/record-with-prev?uuid=%s", url.QueryEscape(uuid)))

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Hash Operations

// VerifyHash verifies a hash computation
func VerifyHash(request HashVerifyRequest) (*APIResponse, error) {
	url := GetKayrosURL("/api/verify-hash")

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// ComputeHashFromHex computes hash from hex input
func ComputeHashFromHex(request ComputeHashRequest) (*APIResponse, error) {
	url := GetKayrosURL("/api/compute-hash-from-hex")

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// gRPC Operations

// SendSingleGRPCRequest sends a single gRPC request to Lightnet
func SendSingleGRPCRequest(request SingleHashRequest) (*APIResponse, error) {
	url := GetKayrosURL("/api/grpc/single-hash")

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// Merkle Proof Operations

// GenerateMerkleProof generates a Merkle proof for a specific hash
func GenerateMerkleProof(request GenerateMerkleProofRequest) (*APIResponse, error) {
	url := GetKayrosURL("/api/merkle/generate-proof")

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// VerifyMerkleProof verifies a Merkle proof
func VerifyMerkleProof(request VerifyMerkleProofRequest) (*APIResponse, error) {
	url := GetKayrosURL("/api/merkle/verify-proof")

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

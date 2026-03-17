package provable

import (
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
	TotalHashes    int64            `json:"total_hashes"`
	CountByType    map[string]int64 `json:"count_by_type"`
	MinTimestamp   string           `json:"min_timestamp"`
	MaxTimestamp   string           `json:"max_timestamp"`
	TimestampRange string           `json:"timestamp_range"`
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
	PrevHash string `json:"prev_hash,omitempty"`
	DataType string `json:"data_type"`
	DataItem string `json:"data_item"`
	TimeUUID string `json:"timeuuid"`
	HashType string `json:"hash_type"`
}

type ComputeHashResponse struct {
	Hash      string `json:"hash"`
	HashType  string `json:"hash_type"`
	InputSize int    `json:"input_size"`
}

// gRPC types

type SingleHashRequest struct {
	DataType string `json:"data_type"` // 64 hex chars (32 bytes)
	DataItem string `json:"data_item"` // 64 hex chars (32 bytes)
}

type SingleHashResponse struct {
	Success         bool   `json:"success"`
	Message         string `json:"message"`
	DataType        string `json:"data_type"`
	DataItem        string `json:"data_item"`
	ComputedHashHex string `json:"computed_hash_hex"`
	TimeuuidHex     string `json:"timeuuid_hex"`
	DataTypeHex     string `json:"data_type_hex"`
	DataItemHex     string `json:"data_item_hex"`
}

type GetRecordByDataItemResponse struct {
	Records []GetRecordResponse `json:"records"`
	Count   int                 `json:"count"`
}

type MerkleProofResponse struct {
	Success     bool     `json:"success"`
	DataType    string   `json:"data_type"`
	HashItem    string   `json:"hash_item"`
	Proof       []string `json:"proof"`
	Root        string   `json:"root"`
	Position    int64    `json:"position"`
	Levels      int      `json:"levels"`
	LevelCounts []int    `json:"level_counts"`
	LevelStarts []int64  `json:"level_starts"`
	Message     string   `json:"message,omitempty"`
	Error       string   `json:"error,omitempty"`
}

type VerifyHashExistenceRequest struct {
	DataType string `json:"data_type"`
	Level    int    `json:"level"`
	Position int64  `json:"position"`
	Hash     string `json:"hash"`
}

type VerifyHashExistenceResponse struct {
	Exists    bool   `json:"exists"`
	Level     int    `json:"level"`
	Position  int64  `json:"position"`
	DataType  string `json:"data_type"`
	FoundHash string `json:"found_hash,omitempty"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
}

type VerifyHashBatchRequest struct {
	DataType string   `json:"data_type"`
	Level    int      `json:"level"`
	Start    int64    `json:"start"`
	Hashes   []string `json:"hashes"`
}

type VerifyHashBatchResponse struct {
	DataType   string `json:"data_type"`
	Level      int    `json:"level"`
	Start      int64  `json:"start"`
	Count      int    `json:"count"`
	Results    []int  `json:"results"`
	Matches    int    `json:"matches"`
	Mismatches int    `json:"mismatches"`
	Message    string `json:"message,omitempty"`
	Error      string `json:"error,omitempty"`
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

	resp, err := doJSONPost(url, jsonData)
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

	resp, err := doJSONGet(url)
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

	resp, err := doJSONGet(url)
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

	resp, err := doJSONGet(url)
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

	resp, err := doJSONGet(url)
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

	resp, err := doJSONPost(url, jsonData)
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

	resp, err := doJSONGet(url)
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

	resp, err := doJSONGet(url)
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

// GetRecordByDataItem gets records by data_type and data_item.
func GetRecordByDataItem(dataType string, dataItem string, apiKey ...string) (*GetRecordByDataItemResponse, error) {
	params := url.Values{}
	params.Set("data_type", dataType)
	params.Set("data_item", dataItem)
	endpoint := GetKayrosURL(GetRecordByDataItemRoute + "?" + params.Encode())

	override := ""
	if len(apiKey) > 0 {
		override = apiKey[0]
	}

	resp, err := doJSONGetWithAPIKey(endpoint, override)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result GetRecordByDataItemResponse
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

	resp, err := doJSONPost(url, jsonData)
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

// ComputeHashFromHex recomputes a Kayros record hash from record fields.
func ComputeHashFromHex(request ComputeHashRequest, apiKey ...string) (*ComputeHashResponse, error) {
	url := GetKayrosURL(ComputeHashFromHexRoute)

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	override := ""
	if len(apiKey) > 0 {
		override = apiKey[0]
	}

	resp, err := doJSONPostWithAPIKey(url, jsonData, override)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result ComputeHashResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// gRPC Operations

// SendSingleGRPCRequest sends a single gRPC request to Lightnet
func SendSingleGRPCRequest(request SingleHashRequest) (*APIResponse, error) {
	url := GetKayrosURL(ProveSingleHashRoute)

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := doJSONPost(url, jsonData)
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

// GetMerkleProof retrieves a Merkle proof by hash or position.
func GetMerkleProof(dataType string, hash string, position *int64, apiKey ...string) (*MerkleProofResponse, error) {
	params := url.Values{}
	params.Set("data_type", dataType)
	if hash != "" {
		params.Set("hash", hash)
	}
	if position != nil {
		params.Set("position", fmt.Sprintf("%d", *position))
	}
	endpoint := GetKayrosURL(GetMerkleProofRoute + "?" + params.Encode())

	override := ""
	if len(apiKey) > 0 {
		override = apiKey[0]
	}

	resp, err := doJSONGetWithAPIKey(endpoint, override)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result MerkleProofResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// VerifyHashExistence checks if a hash exists at a level and position.
func VerifyHashExistence(request VerifyHashExistenceRequest, apiKey ...string) (*VerifyHashExistenceResponse, error) {
	url := GetKayrosURL(VerifyHashExistenceRoute)

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	override := ""
	if len(apiKey) > 0 {
		override = apiKey[0]
	}

	resp, err := doJSONPostWithAPIKey(url, jsonData, override)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result VerifyHashExistenceResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// VerifyHashBatch checks a range of hashes for a level/start window.
func VerifyHashBatch(request VerifyHashBatchRequest, apiKey ...string) (*VerifyHashBatchResponse, error) {
	url := GetKayrosURL(VerifyHashBatchRoute)

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	override := ""
	if len(apiKey) > 0 {
		override = apiKey[0]
	}

	resp, err := doJSONPostWithAPIKey(url, jsonData, override)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result VerifyHashBatchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

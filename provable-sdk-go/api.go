package provable

import (
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"
)

// ProveSingleHash calls the Kayros API to prove a single hash
// dataType is optional and defaults to "provable_sdk" padded to 32 bytes
func ProveSingleHash(dataHash string, dataType ...string) (*ProveSingleHashResponse, error) {
	url := GetKayrosURL(ProveSingleHashRoute)

	dt := DataType
	if len(dataType) > 0 && dataType[0] != "" {
		dt = dataType[0]
	}

	requestBody := map[string]string{
		"data_item": dataHash,
		"data_type": dt,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := doJSONPost(url, jsonData)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("kayros API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result ProveSingleHashResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetRecordByHash gets a Kayros record by hash
func GetRecordByHash(recordHash string, dataType ...string) (*GetRecordResponse, error) {
	formattedHash := FormatHashForQuery(recordHash)
	baseURL := GetKayrosURL(GetRecordByHashRoute)
	buildURL := func(hash string) string {
		query := fmt.Sprintf("%s?hash=%s", baseURL, url.QueryEscape(hash))
		// Backward-compatible behavior:
		// - no arg: use default DATA_TYPE
		// - arg == "": omit data_type
		// - arg != "": use provided data_type
		if len(dataType) == 0 {
			query += "&data_type=" + url.QueryEscape(FormatDataTypeForQuery(DataType))
		} else if dataType[0] != "" {
			query += "&data_type=" + url.QueryEscape(FormatDataTypeForQuery(dataType[0]))
		}
		return query
	}
	url := buildURL(formattedHash)
	var resp *http.Response
	var err error
	for attempt := 0; attempt < 3; attempt++ {
		resp, err = doJSONGet(url)
		if err != nil {
			return nil, fmt.Errorf("failed to make request: %w", err)
		}
		if resp.StatusCode == http.StatusOK {
			break
		}
		if resp.StatusCode != http.StatusNotFound || attempt == 2 {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			return nil, fmt.Errorf("kayros API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
		}
		resp.Body.Close()
		time.Sleep(1 * time.Second)
	}
	defer resp.Body.Close()

	var result GetRecordResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.DataItemHex == "" && result.DataItem != "" {
		if decoded, err := base64.StdEncoding.DecodeString(result.DataItem); err == nil {
			result.DataItemHex = hex.EncodeToString(decoded)
		} else if decoded, err := base64.URLEncoding.DecodeString(result.DataItem); err == nil {
			result.DataItemHex = hex.EncodeToString(decoded)
		}
	}

	return &result, nil
}

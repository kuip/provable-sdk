package provable

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// ProveSingleHash calls the Kayros API to prove a single hash
func ProveSingleHash(dataHash string) (*ProveSingleHashResponse, error) {
	url := GetKayrosURL(ProveSingleHashRoute)

	requestBody := map[string]string{
		"data_item": dataHash,
		"data_type": DataType,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
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
func GetRecordByHash(recordHash string) (*GetRecordResponse, error) {
	url := fmt.Sprintf("%s?hash_item=%s", GetKayrosURL(GetRecordByHashRoute), recordHash)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("kayros API error: %d %s - %s", resp.StatusCode, resp.Status, string(body))
	}

	var result GetRecordResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

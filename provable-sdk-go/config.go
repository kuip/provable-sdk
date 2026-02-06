package provable

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/url"
	"regexp"
)

// Configuration constants
const (
	// KayrosHost is the base URL for the Kayros API
	KayrosHost = "https://kayros.provable.dev"

	// ProveSingleHashRoute is the API route for proving a single hash
	ProveSingleHashRoute = "/api/lightnet/grpc/single-hash"

	// GetRecordByHashRoute is the API route for getting a record by hash
	GetRecordByHashRoute = "/api/lightnet/database/record-by-hash"

	// DataType is the default data type label for Kayros API
	DataType = "provable_sdk\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
)

// GetKayrosURL builds a full Kayros API URL from a route
func GetKayrosURL(route string) string {
	return KayrosHost + route
}

// GetRecordURL returns the URL to view a record on Kayros by its hash
func GetRecordURL(hash string, dataType ...string) string {
	dt := DataType
	if len(dataType) > 0 && dataType[0] != "" {
		dt = dataType[0]
	}
	padded := FormatDataTypeForQuery(dt)
	formattedHash := FormatHashForQuery(hash)
	return fmt.Sprintf(
		"%s%s?hash=%s&data_type=%s",
		KayrosHost,
		GetRecordByHashRoute,
		url.QueryEscape(formattedHash),
		url.QueryEscape(padded),
	)
}

// ValidateDataType validates that a data type is at most 32 bytes
func ValidateDataType(dataType string) error {
	if len([]byte(dataType)) > 32 {
		return fmt.Errorf("data_type must be at most 32 bytes, got %d bytes", len([]byte(dataType)))
	}
	return nil
}

// FormatDataTypeForQuery trims trailing nulls for query params.
func FormatDataTypeForQuery(dataType string) string {
	b := make([]byte, 32)
	data := []byte(dataType)
	if len(data) > 32 {
		data = data[:32]
	}
	copy(b, data)
	end := len(b)
	for end > 0 && b[end-1] == 0 {
		end--
	}
	return string(b[:end])
}

var hex64Pattern = regexp.MustCompile("^[0-9a-fA-F]{64}$")

// FormatHashForQuery base64-encodes hex hashes for Kayros query params.
func FormatHashForQuery(hash string) string {
	if hex64Pattern.MatchString(hash) {
		b, err := hex.DecodeString(hash)
		if err == nil {
			return base64.StdEncoding.EncodeToString(b)
		}
	}
	return hash
}

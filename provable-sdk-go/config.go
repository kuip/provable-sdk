package provable

import (
	"fmt"
	"regexp"
)

// Configuration constants
const (
	// KayrosHost is the base URL for the Kayros API
	KayrosHost = "https://kayros.provable.dev"

	// ProveSingleHashRoute is the API route for proving a single hash
	ProveSingleHashRoute = "/api/grpc/single-hash"

	// GetRecordByHashRoute is the API route for getting a record by hash
	GetRecordByHashRoute = "/api/database/record-by-hash"

	// DataType is the data type identifier for Kayros API
	// "provable_sdk" (0x70726f7661626c655f73646b) padded to 32 bytes
	DataType = "70726f7661626c655f73646b0000000000000000000000000000000000000000"
)

// GetKayrosURL builds a full Kayros API URL from a route
func GetKayrosURL(route string) string {
	return KayrosHost + route
}

// GetRecordURL returns the URL to view a record on Kayros by its hash
func GetRecordURL(hash string) string {
	return fmt.Sprintf("%s/api/database/record-by-hash?hash_item=%s", KayrosHost, hash)
}

// ValidateDataType validates that a data type is exactly 32 bytes (64 hex characters)
func ValidateDataType(dataType string) error {
	if len(dataType) != 64 {
		return fmt.Errorf("data_type must be exactly 64 hex characters (32 bytes), got %d characters", len(dataType))
	}

	matched, err := regexp.MatchString("^[0-9a-fA-F]{64}$", dataType)
	if err != nil {
		return fmt.Errorf("failed to validate data_type: %w", err)
	}
	if !matched {
		return fmt.Errorf("data_type must contain only valid hex characters (0-9, a-f, A-F)")
	}

	return nil
}

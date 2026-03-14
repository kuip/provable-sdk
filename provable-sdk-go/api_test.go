package provable

import "testing"

// Note: These tests validate the function signatures.
// Full integration tests would require mocking HTTP calls.

func TestGetRecordByHashSignature(t *testing.T) {
	// Test that function signature is correct
	// This is a compile-time check
	var _ func(string, ...string) (*GetRecordResponse, error) = GetRecordByHash
	var _ func(string, *RequestOptions) (*GetRecordResponse, error) = GetRecordByHashWithOptions
}

func TestProveSingleHashSignature(t *testing.T) {
	// Test that function signature accepts variadic dataType parameter
	// This is a compile-time check
	var _ func(string, ...string) (*ProveSingleHashResponse, error) = ProveSingleHash
	var _ func(string, *RequestOptions) (*ProveSingleHashResponse, error) = ProveSingleHashWithOptions
}

package provable

import (
	"strings"
	"testing"
)

// Note: These tests validate the function signatures and data type validation.
// Full integration tests would require mocking HTTP calls.

func TestProveSingleHashValidation(t *testing.T) {
	t.Run("should accept call without data type (uses default)", func(t *testing.T) {
		// This test just validates the function signature accepts optional dataType
		// We can't actually call it without a mock, but we verify the validation logic
		err := ValidateDataType(DataType)
		if err != nil {
			t.Errorf("Default DataType failed validation: %v", err)
		}
	})

	t.Run("should validate custom data type length", func(t *testing.T) {
		shortDataType := "short"
		err := ValidateDataType(shortDataType)
		if err == nil {
			t.Error("Expected error for short data type, got nil")
		}
		if !strings.Contains(err.Error(), "data_type must be exactly 64 hex characters") {
			t.Errorf("Wrong error message: %v", err)
		}
	})

	t.Run("should validate custom data type hex characters", func(t *testing.T) {
		invalidHex := "gggg" + strings.Repeat("0", 60)
		err := ValidateDataType(invalidHex)
		if err == nil {
			t.Error("Expected error for non-hex data type, got nil")
		}
		if !strings.Contains(err.Error(), "data_type must contain only valid hex characters") {
			t.Errorf("Wrong error message: %v", err)
		}
	})

	t.Run("should accept valid custom data type", func(t *testing.T) {
		validDataType := "70726f7661626c655f73646b0000000000000000000000000000000000000000"
		err := ValidateDataType(validDataType)
		if err != nil {
			t.Errorf("Valid data type failed validation: %v", err)
		}
	})
}

func TestGetRecordByHashSignature(t *testing.T) {
	// Test that function signature is correct
	// This is a compile-time check
	var _ func(string) (*GetRecordResponse, error) = GetRecordByHash
}

func TestProveSingleHashSignature(t *testing.T) {
	// Test that function signature accepts variadic dataType parameter
	// This is a compile-time check
	var _ func(string, ...string) (*ProveSingleHashResponse, error) = ProveSingleHash
}

func TestDataTypeValidationInProveSingleHash(t *testing.T) {
	// Test the validation logic that would be used in ProveSingleHash
	testCases := []struct {
		name      string
		dataType  string
		wantError bool
	}{
		{
			name:      "valid data type",
			dataType:  "70726f7661626c655f73646b0000000000000000000000000000000000000000",
			wantError: false,
		},
		{
			name:      "too short",
			dataType:  "abc",
			wantError: true,
		},
		{
			name:      "too long",
			dataType:  strings.Repeat("a", 100),
			wantError: true,
		},
		{
			name:      "non-hex characters",
			dataType:  "gggg" + strings.Repeat("0", 60),
			wantError: true,
		},
		{
			name:      "special characters",
			dataType:  "####" + strings.Repeat("0", 60),
			wantError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateDataType(tc.dataType)
			if (err != nil) != tc.wantError {
				t.Errorf("ValidateDataType() error = %v, wantError %v", err, tc.wantError)
			}
		})
	}
}

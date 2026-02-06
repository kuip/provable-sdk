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
		if err != nil {
			t.Errorf("Short data type failed validation: %v", err)
		}
	})

	t.Run("should accept valid custom data type", func(t *testing.T) {
		validDataType := "provable_sdk"
		err := ValidateDataType(validDataType)
		if err != nil {
			t.Errorf("Valid data type failed validation: %v", err)
		}
	})
}

func TestGetRecordByHashSignature(t *testing.T) {
	// Test that function signature is correct
	// This is a compile-time check
	var _ func(string, ...string) (*GetRecordResponse, error) = GetRecordByHash
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
			dataType:  "provable_sdk",
			wantError: false,
		},
		{
			name:      "too long",
			dataType:  strings.Repeat("a", 100),
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

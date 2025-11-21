package provable

import (
	"strings"
	"testing"
)

func TestGetKayrosURL(t *testing.T) {
	t.Run("build correct URL from route", func(t *testing.T) {
		url := GetKayrosURL("/api/test")
		expected := KayrosHost + "/api/test"
		if url != expected {
			t.Errorf("GetKayrosURL() = %v, want %v", url, expected)
		}
	})

	t.Run("concatenate host and route", func(t *testing.T) {
		url1 := GetKayrosURL("/api/test")
		expected1 := KayrosHost + "/api/test"
		if url1 != expected1 {
			t.Errorf("GetKayrosURL('/api/test') = %v, want %v", url1, expected1)
		}

		url2 := GetKayrosURL("api/test")
		expected2 := KayrosHost + "api/test"
		if url2 != expected2 {
			t.Errorf("GetKayrosURL('api/test') = %v, want %v", url2, expected2)
		}
	})
}

func TestValidateDataType(t *testing.T) {
	t.Run("accept valid 64-character hex string", func(t *testing.T) {
		validDataType := "70726f7661626c655f73646b0000000000000000000000000000000000000000"
		if err := ValidateDataType(validDataType); err != nil {
			t.Errorf("ValidateDataType() error = %v, want nil", err)
		}
	})

	t.Run("accept uppercase hex characters", func(t *testing.T) {
		validDataType := "70726F7661626C655F73646B0000000000000000000000000000000000000000"
		if err := ValidateDataType(validDataType); err != nil {
			t.Errorf("ValidateDataType() error = %v, want nil", err)
		}
	})

	t.Run("reject strings that are too short", func(t *testing.T) {
		err := ValidateDataType("abc123")
		if err == nil {
			t.Error("ValidateDataType() error = nil, want error for short string")
		}
		if !strings.Contains(err.Error(), "data_type must be exactly 64 hex characters") {
			t.Errorf("ValidateDataType() error = %v, want error about length", err)
		}
	})

	t.Run("reject strings that are too long", func(t *testing.T) {
		tooLong := "70726f7661626c655f73646b" + strings.Repeat("0", 100)
		err := ValidateDataType(tooLong)
		if err == nil {
			t.Error("ValidateDataType() error = nil, want error for long string")
		}
		if !strings.Contains(err.Error(), "data_type must be exactly 64 hex characters") {
			t.Errorf("ValidateDataType() error = %v, want error about length", err)
		}
	})

	t.Run("reject non-hex characters", func(t *testing.T) {
		invalidHex := "gggg" + strings.Repeat("0", 60)
		err := ValidateDataType(invalidHex)
		if err == nil {
			t.Error("ValidateDataType() error = nil, want error for non-hex chars")
		}
		if !strings.Contains(err.Error(), "data_type must contain only valid hex characters") {
			t.Errorf("ValidateDataType() error = %v, want error about hex chars", err)
		}
	})

	t.Run("reject strings with special characters", func(t *testing.T) {
		withSpecial := "70726f76@" + strings.Repeat("0", 55)
		err := ValidateDataType(withSpecial)
		if err == nil {
			t.Error("ValidateDataType() error = nil, want error for special chars")
		}
		if !strings.Contains(err.Error(), "data_type must contain only valid hex characters") {
			t.Errorf("ValidateDataType() error = %v, want error about hex chars", err)
		}
	})
}

func TestDataTypeConstant(t *testing.T) {
	t.Run("exactly 64 characters", func(t *testing.T) {
		if len(DataType) != 64 {
			t.Errorf("DataType length = %v, want 64", len(DataType))
		}
	})

	t.Run("contains only hex characters", func(t *testing.T) {
		for _, c := range DataType {
			if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
				t.Errorf("DataType contains non-hex character: %c", c)
			}
		}
	})

	t.Run("starts with provable_sdk in hex", func(t *testing.T) {
		// "provable_sdk" = 0x70726f7661626c655f73646b
		if !strings.HasPrefix(DataType, "70726f7661626c655f73646b") {
			t.Error("DataType doesn't start with 'provable_sdk' in hex")
		}
	})

	t.Run("passes own validation", func(t *testing.T) {
		if err := ValidateDataType(DataType); err != nil {
			t.Errorf("DataType validation error = %v, want nil", err)
		}
	})
}

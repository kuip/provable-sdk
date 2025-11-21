package provable

import (
	"regexp"
	"testing"
)

// Note: These tests validate the function behavior for hashing and signatures.
// Full integration tests would require mocking the HTTP calls in ProveSingleHash.

func TestProveDataSignature(t *testing.T) {
	// Test that function signature accepts variadic dataType parameter
	// This is a compile-time check
	var _ func([]byte, ...string) (*ProveSingleHashResponse, error) = ProveData
}

func TestProveDataStrSignature(t *testing.T) {
	// Test that function signature accepts variadic dataType parameter
	// This is a compile-time check
	var _ func(string, ...string) (*ProveSingleHashResponse, error) = ProveDataStr
}

func TestProveDataHashing(t *testing.T) {
	t.Run("should produce consistent hashes for same data", func(t *testing.T) {
		data := []byte("test data")
		hash1 := Keccak256(data)
		hash2 := Keccak256(data)

		if hash1 != hash2 {
			t.Errorf("Inconsistent hashes: %v != %v", hash1, hash2)
		}
	})

	t.Run("should produce valid hex hash", func(t *testing.T) {
		data := []byte("test data")
		hash := Keccak256(data)

		if len(hash) != 64 {
			t.Errorf("Hash length = %v, want 64", len(hash))
		}

		matched, _ := regexp.MatchString("^[0-9a-f]{64}$", hash)
		if !matched {
			t.Error("Hash is not valid hex string")
		}
	})

	t.Run("should handle empty data", func(t *testing.T) {
		data := []byte{}
		hash := Keccak256(data)

		if len(hash) != 64 {
			t.Errorf("Hash length = %v, want 64", len(hash))
		}
	})

	t.Run("should produce different hashes for different data", func(t *testing.T) {
		data1 := []byte("test1")
		data2 := []byte("test2")
		hash1 := Keccak256(data1)
		hash2 := Keccak256(data2)

		if hash1 == hash2 {
			t.Error("Same hash for different data")
		}
	})
}

func TestProveDataStrHashing(t *testing.T) {
	t.Run("should produce consistent hashes for same string", func(t *testing.T) {
		str := "test string"
		hash1 := Keccak256Str(str)
		hash2 := Keccak256Str(str)

		if hash1 != hash2 {
			t.Errorf("Inconsistent hashes: %v != %v", hash1, hash2)
		}
	})

	t.Run("should produce valid hex hash", func(t *testing.T) {
		str := "test string"
		hash := Keccak256Str(str)

		if len(hash) != 64 {
			t.Errorf("Hash length = %v, want 64", len(hash))
		}

		matched, _ := regexp.MatchString("^[0-9a-f]{64}$", hash)
		if !matched {
			t.Error("Hash is not valid hex string")
		}
	})

	t.Run("should handle empty string", func(t *testing.T) {
		str := ""
		hash := Keccak256Str(str)

		if len(hash) != 64 {
			t.Errorf("Hash length = %v, want 64", len(hash))
		}
	})

	t.Run("should match Keccak256 with byte conversion", func(t *testing.T) {
		str := "test"
		hashFromStr := Keccak256Str(str)
		hashFromBytes := Keccak256([]byte(str))

		if hashFromStr != hashFromBytes {
			t.Errorf("Hashes don't match: %v != %v", hashFromStr, hashFromBytes)
		}
	})
}

func TestDataTypePassthrough(t *testing.T) {
	t.Run("validate custom data type would be checked", func(t *testing.T) {
		customDataType := "70726f7661626c655f73646b0000000000000000000000000000000000000000"
		err := ValidateDataType(customDataType)
		if err != nil {
			t.Errorf("Valid custom data type failed: %v", err)
		}
	})

	t.Run("invalid custom data type would be rejected", func(t *testing.T) {
		invalidDataType := "short"
		err := ValidateDataType(invalidDataType)
		if err == nil {
			t.Error("Invalid data type should fail validation")
		}
	})
}

package provable

import (
	"bytes"
	"regexp"
	"testing"
)

func TestKeccak256(t *testing.T) {
	t.Run("hash empty data", func(t *testing.T) {
		data := []byte{}
		result := Keccak256(data)
		expected := "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
		if result != expected {
			t.Errorf("Keccak256() = %v, want %v", result, expected)
		}
	})

	t.Run("hash simple data", func(t *testing.T) {
		data := []byte("hello")
		result := Keccak256(data)
		if len(result) != 64 {
			t.Errorf("Keccak256() length = %v, want 64", len(result))
		}
		matched, _ := regexp.MatchString("^[0-9a-f]{64}$", result)
		if !matched {
			t.Error("Keccak256() result is not valid hex")
		}
	})

	t.Run("produce consistent results", func(t *testing.T) {
		data := []byte("test")
		hash1 := Keccak256(data)
		hash2 := Keccak256(data)
		if hash1 != hash2 {
			t.Errorf("Keccak256() inconsistent: %v != %v", hash1, hash2)
		}
	})

	t.Run("produce different hashes for different data", func(t *testing.T) {
		data1 := []byte("hello")
		data2 := []byte("world")
		hash1 := Keccak256(data1)
		hash2 := Keccak256(data2)
		if hash1 == hash2 {
			t.Error("Keccak256() produced same hash for different data")
		}
	})
}

func TestKeccak256Str(t *testing.T) {
	t.Run("hash empty string", func(t *testing.T) {
		result := Keccak256Str("")
		expected := "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470"
		if result != expected {
			t.Errorf("Keccak256Str() = %v, want %v", result, expected)
		}
	})

	t.Run("hash simple string", func(t *testing.T) {
		result := Keccak256Str("hello")
		if len(result) != 64 {
			t.Errorf("Keccak256Str() length = %v, want 64", len(result))
		}
		matched, _ := regexp.MatchString("^[0-9a-f]{64}$", result)
		if !matched {
			t.Error("Keccak256Str() result is not valid hex")
		}
	})

	t.Run("match Keccak256 with string bytes", func(t *testing.T) {
		s := "test string"
		data := []byte(s)
		if Keccak256Str(s) != Keccak256(data) {
			t.Error("Keccak256Str() doesn't match Keccak256()")
		}
	})
}

func TestHashAliases(t *testing.T) {
	t.Run("Hash is same as Keccak256", func(t *testing.T) {
		data := []byte("test")
		if Hash(data) != Keccak256(data) {
			t.Error("Hash() doesn't match Keccak256()")
		}
	})

	t.Run("HashStr is same as Keccak256Str", func(t *testing.T) {
		if HashStr("test") != Keccak256Str("test") {
			t.Error("HashStr() doesn't match Keccak256Str()")
		}
	})
}

func TestSHA256(t *testing.T) {
	t.Run("hash empty data", func(t *testing.T) {
		data := []byte{}
		result := SHA256(data)
		expected := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
		if result != expected {
			t.Errorf("SHA256() = %v, want %v", result, expected)
		}
	})

	t.Run("hash simple data", func(t *testing.T) {
		data := []byte("hello")
		result := SHA256(data)
		if len(result) != 64 {
			t.Errorf("SHA256() length = %v, want 64", len(result))
		}
		matched, _ := regexp.MatchString("^[0-9a-f]{64}$", result)
		if !matched {
			t.Error("SHA256() result is not valid hex")
		}
	})

	t.Run("produce consistent results", func(t *testing.T) {
		data := []byte("test")
		hash1 := SHA256(data)
		hash2 := SHA256(data)
		if hash1 != hash2 {
			t.Errorf("SHA256() inconsistent: %v != %v", hash1, hash2)
		}
	})

	t.Run("produce different hashes for different data", func(t *testing.T) {
		data1 := []byte("hello")
		data2 := []byte("world")
		hash1 := SHA256(data1)
		hash2 := SHA256(data2)
		if hash1 == hash2 {
			t.Error("SHA256() produced same hash for different data")
		}
	})
}

func TestSHA256Str(t *testing.T) {
	t.Run("hash empty string", func(t *testing.T) {
		result := SHA256Str("")
		expected := "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
		if result != expected {
			t.Errorf("SHA256Str() = %v, want %v", result, expected)
		}
	})

	t.Run("hash simple string", func(t *testing.T) {
		result := SHA256Str("hello")
		if len(result) != 64 {
			t.Errorf("SHA256Str() length = %v, want 64", len(result))
		}
		matched, _ := regexp.MatchString("^[0-9a-f]{64}$", result)
		if !matched {
			t.Error("SHA256Str() result is not valid hex")
		}
	})

	t.Run("match SHA256 with string bytes", func(t *testing.T) {
		s := "test string"
		data := []byte(s)
		if SHA256Str(s) != SHA256(data) {
			t.Error("SHA256Str() doesn't match SHA256()")
		}
	})
}

func TestHashAlgorithmsComparison(t *testing.T) {
	t.Run("Keccak256 and SHA256 produce different hashes", func(t *testing.T) {
		data := []byte("test")
		keccakHash := Keccak256(data)
		sha256Hash := SHA256(data)
		if keccakHash == sha256Hash {
			t.Error("Keccak256() and SHA256() produced same hash")
		}
	})
}

func TestHash(t *testing.T) {
	// Test that Hash function works with different data sizes
	testCases := []struct {
		name string
		data []byte
	}{
		{"empty", []byte{}},
		{"small", []byte("test")},
		{"medium", bytes.Repeat([]byte("a"), 1000)},
		{"large", bytes.Repeat([]byte("b"), 10000)},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := Hash(tc.data)
			if len(result) != 64 {
				t.Errorf("Hash() length = %v, want 64", len(result))
			}
		})
	}
}

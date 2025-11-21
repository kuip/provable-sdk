package provable

import (
	"crypto/sha256"
	"encoding/hex"

	"golang.org/x/crypto/sha3"
)

// Keccak256 computes the keccak256 hash of bytes
func Keccak256(data []byte) string {
	hash := sha3.NewLegacyKeccak256()
	hash.Write(data)
	return hex.EncodeToString(hash.Sum(nil))
}

// Hash is an alias for Keccak256
func Hash(data []byte) string {
	return Keccak256(data)
}

// Keccak256Str computes the keccak256 hash of a UTF-8 string
func Keccak256Str(s string) string {
	return Keccak256([]byte(s))
}

// HashStr is an alias for Keccak256Str
func HashStr(s string) string {
	return Keccak256Str(s)
}

// SHA256 computes the SHA-256 hash of bytes
func SHA256(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// SHA256Str computes the SHA-256 hash of a UTF-8 string
func SHA256Str(s string) string {
	return SHA256([]byte(s))
}

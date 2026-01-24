# Provable SDK for Go

A Go SDK for interacting with the Provable Kayros API.

## Installation

```bash
go get github.com/provable/provable-sdk-go
```

## Usage

```go
package main

import (
	"fmt"
	"log"

	provable "github.com/provable/provable-sdk-go"
)

func main() {
	// Hash bytes (keccak256)
	data := []byte{1, 2, 3, 4}
	dataHash := provable.Keccak256(data)
	fmt.Println("Data hash:", dataHash)

	// Hash string (sha256 - default)
	text := "Hello, Provable!"
	strHash := provable.SHA256Str(text)
	fmt.Println("String hash:", strHash)

	// Prove a hash
	proof, err := provable.ProveSingleHash(dataHash)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Proof:", proof)

	// Get a record by hash
	record, err := provable.GetRecordByHash(proof.Data.ComputedHashHex)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Record:", record)

	// Prove data directly
	dataProof, err := provable.ProveData(data)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Data proof:", dataProof)

	// Prove string data directly
	strProof, err := provable.ProveDataStr(text)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("String proof:", strProof)

	// Create and verify a KayrosEnvelope
	envelope := &provable.KayrosEnvelope{
		Data: map[string]string{"message": "Hello, Provable!"},
		Kayros: provable.KayrosMetadata{
			Hash:          strHash,
			HashAlgorithm: "sha256",
			Timestamp: &provable.KayrosTimestamp{
				Service:  "kayros",
				Response: proof,
			},
		},
	}

	result := provable.Verify(envelope)
	if result.Valid {
		fmt.Println("Verification successful!")
	} else {
		fmt.Printf("Verification failed: %s\n", result.Error)
	}
}
```

## API

### Hash Functions

- `Keccak256(data []byte) string` - Compute keccak256 hash of bytes
- `Keccak256Str(s string) string` - Compute keccak256 hash of a UTF-8 string
- `SHA256(data []byte) string` - Compute SHA-256 hash of bytes
- `SHA256Str(s string) string` - Compute SHA-256 hash of a UTF-8 string
- `Hash` / `HashStr` - Aliases for Keccak256 functions

### Prove Functions

- `ProveSingleHash(dataHash string) (*ProveSingleHashResponse, error)` - Prove a hash via Kayros API
- `ProveData(data []byte) (*ProveSingleHashResponse, error)` - Hash and prove bytes
- `ProveDataStr(s string) (*ProveSingleHashResponse, error)` - Hash and prove a string

### Record Functions

- `GetRecordByHash(recordHash string) (*GetRecordResponse, error)` - Get Kayros record by hash

### Verify Function

- `Verify(envelope *KayrosEnvelope) *VerifyResult` - Verify data against Kayros proof

## KayrosEnvelope

The `KayrosEnvelope` struct wraps data with Kayros proof metadata:

```go
envelope := &provable.KayrosEnvelope{
	Data:   myData,
	Kayros: kayrosMetadata,
}

// Helper methods
data, err := envelope.GetData()    // Get data as []byte (decodes base64 for V0)
envelope.GetDataHash()             // Get the data hash (data_item_hex)
envelope.GetDataType()             // Get the data type (data_type_hex)
envelope.GetKayrosHash()           // Get the Kayros hash (computed_hash_hex)
envelope.GetTimeUUID()             // Get the time UUID (timeuuid_hex)
envelope.GetHashAlgorithm()        // Get hash algorithm (defaults to "sha256")
envelope.IsV0()                    // Check if V0 format (legacy, for email proofs)
```

### Envelope Formats

- **V1 (default)**: Hash stored in `Kayros.Hash`, data is plain string or object
- **V0 (legacy)**: Hash in `Kayros.Data.DataItemHex`, data is base64-encoded bytes (used for email proofs)

## Configuration

Default configuration:
- `KayrosHost`: `https://kayros.provable.dev`
- API Routes:
  - Single Hash: `/api/grpc/single-hash`
  - Get Record: `/api/database/record-by-hash`

## License

MIT

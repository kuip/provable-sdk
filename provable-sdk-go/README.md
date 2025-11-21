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
	// Hash bytes
	data := []byte{1, 2, 3, 4}
	dataHash := provable.Hash(data) // or provable.Keccak256(data)
	fmt.Println("Data hash:", dataHash)

	// Hash string
	text := "Hello, Provable!"
	strHash := provable.HashStr(text) // or provable.Keccak256Str(text)
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

	// Verify data with Kayros proof
	envelope := &provable.KayrosEnvelope{
		Data: map[string]string{"message": "Hello, Provable!"},
		Kayros: provable.KayrosMetadata{
			Hash:          "abc123...",
			HashAlgorithm: "keccak256",
			Timestamp: &provable.KayrosTimestamp{
				Service:  "https://kayros.provable.dev/api/grpc/single-hash",
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

- `Hash(data []byte) string` - Compute keccak256 hash of bytes
- `Keccak256(data []byte) string` - Alias for `Hash`
- `HashStr(s string) string` - Compute keccak256 hash of a UTF-8 string
- `Keccak256Str(s string) string` - Alias for `HashStr`

### Prove Functions

- `ProveSingleHash(dataHash string) (*ProveSingleHashResponse, error)` - Prove a hash via Kayros API
- `ProveData(data []byte) (*ProveSingleHashResponse, error)` - Hash and prove bytes
- `ProveDataStr(s string) (*ProveSingleHashResponse, error)` - Hash and prove a string

### Record Functions

- `GetRecordByHash(recordHash string) (*GetRecordResponse, error)` - Get Kayros record by hash

### Verify Function

- `Verify(envelope *KayrosEnvelope) *VerifyResult` - Verify data against Kayros proof

## Configuration

Default configuration:
- `KayrosHost`: `https://kayros.provable.dev`
- API Routes:
  - Single Hash: `/api/grpc/single-hash`
  - Get Record: `/api/database/record-by-hash`

## License

MIT

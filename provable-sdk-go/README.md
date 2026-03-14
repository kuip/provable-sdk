# Provable SDK for Go

A Go SDK for interacting with the Provable Kayros API.

## Installation

```bash
go get github.com/provable/provable-sdk-go
```

## Usage

### 1. Default usage

Use the SDK with no explicit API key and no custom data type. This uses the default `provable_sdk` data type and the built-in default key.

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

### 2. Usage with API key and custom data type

If your app stores a private API key and a project-specific data type in settings, pass them into the SDK through `RequestOptions` and `VerifyOptions`.

```go
package main

import (
	"fmt"
	"log"
	"os"

	provable "github.com/provable/provable-sdk-go"
)

func main() {
	settings := struct {
		APIKey   string
		DataType string
	}{
		APIKey:   os.Getenv("KAYROS_API_KEY"),
		DataType: "kayros_indexer_v1",
	}

	// Optional: set the key once for subsequent calls.
	provable.SetAPIKey(settings.APIKey)

	proof, err := provable.ProveSingleHashWithOptions("your_hash_here", &provable.RequestOptions{
		APIKey:   settings.APIKey,
		DataType: settings.DataType,
	})
	if err != nil {
		log.Fatal(err)
	}

	record, err := provable.GetRecordByHashWithOptions("computed_hash_here", &provable.RequestOptions{
		APIKey:   settings.APIKey,
		DataType: settings.DataType,
	})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(record)

	envelope := &provable.KayrosEnvelope{
		Data: "hello",
		Kayros: provable.KayrosMetadata{
			Hash:          "local_data_hash",
			HashAlgorithm: "keccak256",
			Timestamp: &provable.KayrosTimestamp{
				Service:  "kayros",
				Response: proof,
			},
		},
	}

	result := provable.VerifyWithOptions(envelope, &provable.VerifyOptions{
		APIKey:    settings.APIKey,
		DataTypes: []string{settings.DataType},
	})
	if !result.Valid {
		log.Fatal(result.Error)
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
- `SetAPIKey(apiKey string)` - Set the API key used for subsequent requests

Option-based variants:

- `ProveSingleHashWithOptions(dataHash string, opts *RequestOptions)`
- `ProveDataWithOptions(data []byte, opts *RequestOptions)`
- `ProveDataStrWithOptions(s string, opts *RequestOptions)`

### Record Functions

- `GetRecordByHash(recordHash string) (*GetRecordResponse, error)` - Get Kayros record by hash

Option-based variant:

- `GetRecordByHashWithOptions(recordHash string, opts *RequestOptions)`
- Set `OmitDataType: true` in `RequestOptions` to omit the `data_type` lookup query parameter when needed.

### Verify Function

- `Verify(envelope *KayrosEnvelope) *VerifyResult` - Verify data against Kayros proof

Option-based variant:

- `VerifyWithOptions(envelope *KayrosEnvelope, opts *VerifyOptions) *VerifyResult`

## KayrosEnvelope

The `KayrosEnvelope` struct wraps data with Kayros proof metadata:

```go
envelope := &provable.KayrosEnvelope{
	Data:   myData,
	Kayros: kayrosMetadata,
}

// Helper methods
data, err := envelope.GetData()    // Get data as []byte
envelope.GetDataHash()             // Get the data hash (data_item_hex)
envelope.GetDataType()             // Get the data type (data_type_hex)
envelope.GetKayrosHash()           // Get the Kayros hash (computed_hash_hex)
envelope.GetTimeUUID()             // Get the time UUID (timeuuid_hex)
envelope.GetHashAlgorithm()        // Get hash algorithm (defaults to "sha256")
```

## License

MIT

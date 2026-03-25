# Provable SDK for Go

`provable-sdk-go` is the Kayros API and verification SDK for Go.

## Installation

```bash
go get github.com/provable/provable-sdk-go
```

## Usage

### 1. Default usage

Use the built-in key and the default `provable_sdk` data type.

```go
package main

import (
	"fmt"
	"log"

	provable "github.com/provable/provable-sdk-go"
)

func main() {
	dataItem := "abababababababababababababababababababababababababababababababab"

	proof, err := provable.ProveSingleHash(dataItem)
	if err != nil {
		log.Fatal(err)
	}
	kayrosHash := proof.Hash

	record, err := provable.GetRecordByHash(kayrosHash)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(record)

	verified := provable.Verify(provable.VerifyRequest{
		DataType:   "provable_sdk",
		DataItem:   dataItem,
		KayrosHash: kayrosHash,
	})

	inclusion := provable.VerifyWithInclusion(provable.VerifyWithInclusionRequest{
		VerifyRequest: provable.VerifyRequest{
			DataType:   "provable_sdk",
			KayrosHash: kayrosHash,
		},
	})

	fmt.Println(verified.Valid, inclusion.Valid)
}
```

### 2. Usage with API key and custom data type

```go
package main

import (
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

	provable.SetAPIKey(settings.APIKey)

	proof, err := provable.ProveSingleHashWithOptions("abababababababababababababababababababababababababababababababab", &provable.RequestOptions{
		APIKey:   settings.APIKey,
		DataType: settings.DataType,
	})
	if err != nil {
		panic(err)
	}
	kayrosHash := proof.Hash

	verified := provable.Verify(provable.VerifyRequest{
		DataType:   settings.DataType,
		DataItem:   "abababababababababababababababababababababababababababababababab",
		KayrosHash: kayrosHash,
		APIKey:     settings.APIKey,
	})

	inclusion := provable.VerifyWithInclusion(provable.VerifyWithInclusionRequest{
		VerifyRequest: provable.VerifyRequest{
			DataType:   settings.DataType,
			KayrosHash: kayrosHash,
			APIKey:     settings.APIKey,
		},
		VerifyBatchExistence: true,
	})

	_, _ = verified, inclusion
}
```

## Main API

- `ProveSingleHash(dataHash string)`
- `ProveSingleHashWithOptions(dataHash string, opts *RequestOptions)`
- `GetRecordByHash(kayrosHash string)`
- `GetRecordByHashWithOptions(kayrosHash string, opts *RequestOptions)`
- `GetRecordByDataItem(dataType, dataItem string, apiKey ...string)`
- `GetMerkleProof(dataType, hash string, position *int64, apiKey ...string)`
- `VerifyHashExistence(request VerifyHashExistenceRequest, apiKey ...string)`
- `VerifyHashBatch(request VerifyHashBatchRequest, apiKey ...string)`
- `Verify(request VerifyRequest)`
- `VerifyWithInclusion(request VerifyWithInclusionRequest)`

`DataType` is required for verification. Provide at least one of `DataItem` or `KayrosHash`.

`VerifyWithInclusionRequest` also accepts `LevelsHashType`, which controls the Merkle rollup hash used for local inclusion replay. It defaults to `sha3-256` and also accepts `sha256`.

## License

MIT

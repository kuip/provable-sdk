# Lightnet gRPC Protocol Definitions

This directory contains the Protocol Buffer definitions and generated Go code for the Lightnet gRPC service.

## Files

- `lightnet.proto` - Protocol Buffer service definition
- `lightnet/lightnet.pb.go` - Generated protobuf message definitions
- `lightnet/lightnet_grpc.pb.go` - Generated gRPC client and server code

## Usage

### Using the gRPC Client

```go
import (
    "context"
    "google.golang.org/grpc"
    "github.com/provable/provable-sdk-go/proto/lightnet"
)

// Connect to Lightnet gRPC service
conn, err := grpc.Dial("lightnet.example.com:50051", grpc.WithInsecure())
if err != nil {
    log.Fatal(err)
}
defer conn.Close()

// Create client
client := lightnet.NewHashServiceClient(conn)

// Submit a hash
req := &lightnet.HashRequest{
    DataType: dataTypeBytes,  // 32 bytes
    DataItem: dataItemBytes,  // 32 bytes
}

resp, err := client.SubmitHash(context.Background(), req)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Hash: %s\n", resp.ComputedHashHex)
```

## Regenerating Code

If you need to regenerate the Go code from the .proto file:

```bash
# Install protoc compiler and Go plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate code
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/lightnet.proto
```

## Available RPCs

The HashService provides these methods:

- `SubmitHash` - Submit a single hash to Lightnet
- `SubmitHashStream` - Bidirectional streaming for batch hashing
- `DebugHash` - Get detailed hash computation information
- `GetDatabaseStats` - Get database statistics
- `GetRecord` - Retrieve a record by data_type and data_item
- `GetMerkleProof` - Generate a Merkle proof for a hash
- `GetMerkleRoot` - Get the current Merkle root
- `VerifyMerkleProof` - Verify a Merkle proof

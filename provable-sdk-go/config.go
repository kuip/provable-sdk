package provable

// Configuration constants
const (
	// KayrosHost is the base URL for the Kayros API
	KayrosHost = "https://kayros.provable.dev"

	// ProveSingleHashRoute is the API route for proving a single hash
	ProveSingleHashRoute = "/api/grpc/single-hash"

	// GetRecordByHashRoute is the API route for getting a record by hash
	GetRecordByHashRoute = "/api/database/record-by-hash"

	// DataType is the data type identifier for Kayros API
	DataType = "70726f7661626c655f666f726d73000000000000000000000000000000000000"
)

// GetKayrosURL builds a full Kayros API URL from a route
func GetKayrosURL(route string) string {
	return KayrosHost + route
}

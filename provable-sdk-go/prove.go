package provable

// ProveData proves data by computing its hash and calling Kayros API
// dataType is optional and defaults to "provable_sdk" padded to 32 bytes
func ProveData(data []byte, dataType ...string) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256(data)
	return ProveSingleHash(dataHash, dataType...)
}

// ProveDataWithOptions proves data by computing its hash and calling Kayros API with explicit request options.
func ProveDataWithOptions(data []byte, opts *RequestOptions) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256(data)
	return ProveSingleHashWithOptions(dataHash, opts)
}

// ProveDataStr proves string data by computing its hash and calling Kayros API
// dataType is optional and defaults to "provable_sdk" padded to 32 bytes
func ProveDataStr(s string, dataType ...string) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256Str(s)
	return ProveSingleHash(dataHash, dataType...)
}

// ProveDataStrWithOptions proves string data by computing its hash and calling Kayros API with explicit request options.
func ProveDataStrWithOptions(s string, opts *RequestOptions) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256Str(s)
	return ProveSingleHashWithOptions(dataHash, opts)
}

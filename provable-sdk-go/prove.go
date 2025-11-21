package provable

// ProveData proves data by computing its hash and calling Kayros API
// dataType is optional and defaults to "provable_sdk" padded to 32 bytes
func ProveData(data []byte, dataType ...string) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256(data)
	return ProveSingleHash(dataHash, dataType...)
}

// ProveDataStr proves string data by computing its hash and calling Kayros API
// dataType is optional and defaults to "provable_sdk" padded to 32 bytes
func ProveDataStr(s string, dataType ...string) (*ProveSingleHashResponse, error) {
	dataHash := Keccak256Str(s)
	return ProveSingleHash(dataHash, dataType...)
}

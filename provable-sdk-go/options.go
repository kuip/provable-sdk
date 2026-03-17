package provable

type RequestOptions struct {
	DataType     string
	OmitDataType bool
	APIKey       string
}

func resolveRequestOptions(opts *RequestOptions) (dataType string, includeDataType bool, apiKey string) {
	if opts == nil {
		return DataType, true, ""
	}
	if opts.OmitDataType {
		return "", false, opts.APIKey
	}
	if opts.DataType != "" {
		return opts.DataType, true, opts.APIKey
	}
	return DataType, true, opts.APIKey
}

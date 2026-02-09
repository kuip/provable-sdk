package provable

import (
	"strings"
	"testing"
)

func TestGetKayrosURL(t *testing.T) {
	t.Run("build correct URL from route", func(t *testing.T) {
		url := GetKayrosURL("/api/test")
		expected := KayrosHost + "/api/test"
		if url != expected {
			t.Errorf("GetKayrosURL() = %v, want %v", url, expected)
		}
	})

	t.Run("concatenate host and route", func(t *testing.T) {
		url1 := GetKayrosURL("/api/test")
		expected1 := KayrosHost + "/api/test"
		if url1 != expected1 {
			t.Errorf("GetKayrosURL('/api/test') = %v, want %v", url1, expected1)
		}

		url2 := GetKayrosURL("api/test")
		expected2 := KayrosHost + "api/test"
		if url2 != expected2 {
			t.Errorf("GetKayrosURL('api/test') = %v, want %v", url2, expected2)
		}
	})
}

func TestDataTypeConstant(t *testing.T) {
	t.Run("padded to 32 bytes", func(t *testing.T) {
		if len([]byte(DataType)) != 32 {
			t.Errorf("DataType length = %v, want 32 bytes", len([]byte(DataType)))
		}
		if strings.TrimRight(DataType, "\x00") != "provable_sdk" {
			t.Error("DataType doesn't match padded provable_sdk label")
		}
	})
}

func TestUserKeyConfig(t *testing.T) {
	t.Run("default user key is set", func(t *testing.T) {
		SetUserKey(DefaultUserKey)
		if GetUserKey() != DefaultUserKey {
			t.Errorf("GetUserKey() = %v, want %v", GetUserKey(), DefaultUserKey)
		}
	})

	t.Run("set custom user key", func(t *testing.T) {
		customKey := "0xabc123"
		SetUserKey(customKey)
		if GetUserKey() != customKey {
			t.Errorf("GetUserKey() = %v, want %v", GetUserKey(), customKey)
		}
		SetUserKey(DefaultUserKey)
	})
}

package provable

import "testing"

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
	t.Run("plain default label", func(t *testing.T) {
		if DataType != "provable_sdk" {
			t.Errorf("DataType = %q, want %q", DataType, "provable_sdk")
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

	t.Run("api key aliases match user key config", func(t *testing.T) {
		SetAPIKey(DefaultAPIKey)
		if GetAPIKey() != DefaultUserKey {
			t.Errorf("GetAPIKey() = %v, want %v", GetAPIKey(), DefaultUserKey)
		}
	})
}

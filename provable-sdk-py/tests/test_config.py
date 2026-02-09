"""
Tests for config module
"""

from provable_sdk.config import (
    get_kayros_url,
    DATA_TYPE,
    KAYROS_HOST,
    DEFAULT_USER_KEY,
    get_user_key,
    set_user_key,
)


class TestGetKayrosUrl:
    def test_build_correct_url_from_route(self):
        assert get_kayros_url("/api/test") == f"{KAYROS_HOST}/api/test"

    def test_concatenate_host_and_route(self):
        assert get_kayros_url("/api/test") == f"{KAYROS_HOST}/api/test"
        assert get_kayros_url("api/test") == f"{KAYROS_HOST}api/test"


class TestDataTypeConstant:
    def test_is_padded_label(self):
        assert DATA_TYPE.replace("\x00", "") == "provable_sdk"
        assert len(DATA_TYPE.encode("utf-8")) == 32


class TestUserKey:
    def test_default_user_key(self):
        set_user_key(DEFAULT_USER_KEY)
        assert get_user_key() == DEFAULT_USER_KEY

    def test_set_user_key(self):
        set_user_key("0xabc123")
        assert get_user_key() == "0xabc123"
        set_user_key(DEFAULT_USER_KEY)

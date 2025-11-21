"""
Tests for prove module
"""

import pytest
from unittest.mock import patch
from provable_sdk.prove import prove_data, prove_data_str


class TestProveData:
    @patch("provable_sdk.prove.prove_single_hash")
    def test_hash_data_and_call_prove_single_hash(self, mock_prove):
        mock_prove.return_value = {"data": {"computed_hash_hex": "abc123"}}

        data = b"test data"
        result = prove_data(data)

        mock_prove.assert_called_once()
        hash_arg = mock_prove.call_args[0][0]
        assert len(hash_arg) == 64
        import re
        assert re.match(r"^[0-9a-f]{64}$", hash_arg)
        assert result == {"data": {"computed_hash_hex": "abc123"}}

    @patch("provable_sdk.prove.prove_single_hash")
    def test_pass_custom_data_type_to_prove_single_hash(self, mock_prove):
        custom_data_type = "70726f7661626c655f666f726d73000000000000000000000000000000000000"
        mock_prove.return_value = {"data": {"computed_hash_hex": "def456"}}

        data = b"test data"
        prove_data(data, data_type=custom_data_type)

        args = mock_prove.call_args[0]
        kwargs = mock_prove.call_args[1] if len(mock_prove.call_args) > 1 else {}
        # Check if data_type was passed as keyword argument
        assert kwargs.get("data_type") == custom_data_type or args[1] == custom_data_type

    @patch("provable_sdk.prove.prove_single_hash")
    def test_produce_consistent_hashes_for_same_data(self, mock_prove):
        mock_prove.return_value = {}

        data = b"test"
        prove_data(data)
        hash1 = mock_prove.call_args[0][0]

        prove_data(data)
        hash2 = mock_prove.call_args[0][0]

        assert hash1 == hash2


class TestProveDataStr:
    @patch("provable_sdk.prove.prove_single_hash")
    def test_hash_string_and_call_prove_single_hash(self, mock_prove):
        mock_prove.return_value = {"data": {"computed_hash_hex": "abc123"}}

        result = prove_data_str("test string")

        mock_prove.assert_called_once()
        hash_arg = mock_prove.call_args[0][0]
        assert len(hash_arg) == 64
        import re
        assert re.match(r"^[0-9a-f]{64}$", hash_arg)
        assert result == {"data": {"computed_hash_hex": "abc123"}}

    @patch("provable_sdk.prove.prove_single_hash")
    def test_pass_custom_data_type_to_prove_single_hash(self, mock_prove):
        custom_data_type = "70726f7661626c655f666f726d73000000000000000000000000000000000000"
        mock_prove.return_value = {"data": {"computed_hash_hex": "def456"}}

        prove_data_str("test string", data_type=custom_data_type)

        args = mock_prove.call_args[0]
        kwargs = mock_prove.call_args[1] if len(mock_prove.call_args) > 1 else {}
        assert kwargs.get("data_type") == custom_data_type or args[1] == custom_data_type

    @patch("provable_sdk.prove.prove_single_hash")
    def test_handle_empty_string(self, mock_prove):
        mock_prove.return_value = {}

        prove_data_str("")

        hash_arg = mock_prove.call_args[0][0]
        assert len(hash_arg) == 64
        import re
        assert re.match(r"^[0-9a-f]{64}$", hash_arg)

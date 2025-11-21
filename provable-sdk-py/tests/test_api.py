"""
Tests for API module
"""

import pytest
from unittest.mock import Mock, patch
from provable_sdk.api import prove_single_hash, get_record_by_hash
from provable_sdk.config import get_kayros_url, API_ROUTES, DATA_TYPE


class TestProveSingleHash:
    @patch("provable_sdk.api.requests.post")
    def test_call_api_with_default_data_type(self, mock_post):
        mock_response = Mock()
        mock_response.json.return_value = {"data": {"computed_hash_hex": "abc123"}}
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        result = prove_single_hash("test_hash")

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert get_kayros_url(API_ROUTES["PROVE_SINGLE_HASH"]) in args
        assert kwargs["json"]["data_item"] == "test_hash"
        assert kwargs["json"]["data_type"] == DATA_TYPE
        assert result == {"data": {"computed_hash_hex": "abc123"}}

    @patch("provable_sdk.api.requests.post")
    def test_call_api_with_custom_data_type(self, mock_post):
        custom_data_type = "70726f7661626c655f666f726d73000000000000000000000000000000000000"
        mock_response = Mock()
        mock_response.json.return_value = {"data": {"computed_hash_hex": "def456"}}
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        prove_single_hash("test_hash", data_type=custom_data_type)

        args, kwargs = mock_post.call_args
        assert kwargs["json"]["data_type"] == custom_data_type

    def test_throw_error_for_invalid_data_type_length(self):
        with pytest.raises(ValueError, match="data_type must be exactly 64 hex characters"):
            prove_single_hash("test_hash", data_type="short")

    def test_throw_error_for_non_hex_data_type(self):
        invalid_data_type = "gggg" + ("0" * 60)
        with pytest.raises(ValueError, match="data_type must contain only valid hex characters"):
            prove_single_hash("test_hash", data_type=invalid_data_type)

    @patch("provable_sdk.api.requests.post")
    def test_raise_error_when_api_returns_error_status(self, mock_post):
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("API error: 500")
        mock_post.return_value = mock_response

        with pytest.raises(Exception, match="API error: 500"):
            prove_single_hash("test_hash")


class TestGetRecordByHash:
    @patch("provable_sdk.api.requests.get")
    def test_call_api_with_correct_url(self, mock_get):
        mock_response = Mock()
        mock_response.json.return_value = {
            "data": {"data_item_hex": "abc123", "timestamp": "2024-01-01"}
        }
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = get_record_by_hash("record_hash_123")

        mock_get.assert_called_once()
        args = mock_get.call_args[0]
        assert "record_hash_123" in args[0]
        assert "record-by-hash" in args[0]
        assert result == {"data": {"data_item_hex": "abc123", "timestamp": "2024-01-01"}}

    @patch("provable_sdk.api.requests.get")
    def test_raise_error_when_api_returns_error_status(self, mock_get):
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("API error: 404")
        mock_get.return_value = mock_response

        with pytest.raises(Exception, match="API error: 404"):
            get_record_by_hash("nonexistent")

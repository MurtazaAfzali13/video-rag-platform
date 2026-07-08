# app/graph/tests/conftest.py
import pytest
from unittest.mock import Mock, patch


@pytest.fixture
def mock_settings():
    """Mock application settings."""
    with patch('app.graph.nodes.get_settings') as mock:
        settings = Mock()
        settings.index_name = "test_index"
        settings.pinecone_api_key = "test_key"
        settings.openrouter_api_key = "test_openrouter_key"
        settings.openrouter_base_url = "https://test.com"
        mock.return_value = settings
        yield mock


@pytest.fixture
def sample_state():
    """Create a sample agent state for testing."""
    return {
        "query": "Test query",
        "search_scope": "single_video",
        "user_id": "test_user",
        "video_id": "test_video",
        "messages": [],
        "next_node": None,
        "documents": None,
        "response": None,
    }
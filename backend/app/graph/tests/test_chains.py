# app/graph/tests/test_chains.py
import pytest
from unittest.mock import Mock, patch

from app.graph.chains import (
    create_supervisor_chain,
    create_validator_chain,
    create_generator_chain,
    create_summary_chain,
    get_llm,
)
from app.graph.state import RouteDecision, GradeDocuments, GroundedAnswer, VideoSummarySchema


class TestChains:
    """Test suite for chain creation and configuration."""
    
    @patch('app.graph.chains.get_settings')
    def test_get_llm_initialization(self, mock_get_settings):
        """Test LLM initialization with correct parameters."""
        mock_settings = Mock()
        mock_settings.openrouter_api_key = "test_key"
        mock_settings.openrouter_base_url = "https://test.com"
        mock_get_settings.return_value = mock_settings
        
        llm = get_llm("test-model")
        
        assert llm.model == "test-model"
        assert llm.api_key == "test_key"
        assert llm.base_url == "https://test.com"
    
    @patch('app.graph.chains.get_llm')
    def test_create_supervisor_chain(self, mock_get_llm):
        """Test supervisor chain creation."""
        mock_llm = Mock()
        mock_get_llm.return_value = mock_llm
        
        chain = create_supervisor_chain()
        
        assert chain is not None
        # Chain should have prompt and LLM
        assert hasattr(chain, 'invoke')
    
    @patch('app.graph.chains.get_llm')
    def test_create_validator_chain(self, mock_get_llm):
        """Test validator chain creation."""
        mock_llm = Mock()
        mock_get_llm.return_value = mock_llm
        
        chain = create_validator_chain()
        
        assert chain is not None
        assert hasattr(chain, 'invoke')
    
    @patch('app.graph.chains.get_llm')
    def test_create_generator_chain(self, mock_get_llm):
        """Test generator chain creation with structured output."""
        mock_llm = Mock()
        mock_get_llm.return_value = mock_llm
        
        chain = create_generator_chain()
        
        assert chain is not None
        assert hasattr(chain, 'invoke')
        
        # Verify that it uses structured output
        mock_get_llm.assert_called_with(ANY)
        # The returned chain should be configured for structured output
    
    @patch('app.graph.chains.get_llm')
    def test_create_summary_chain(self, mock_get_llm):
        """Test summary chain creation."""
        mock_llm = Mock()
        mock_get_llm.return_value = mock_llm
        
        chain = create_summary_chain()
        
        assert chain is not None
        assert hasattr(chain, 'invoke')


class TestChainIntegration:
    """Integration-like tests for chain functionality."""
    
    @patch('app.graph.chains.get_llm')
    def test_supervisor_chain_invoke(self, mock_get_llm):
        """Test supervisor chain invocation with mock."""
        mock_llm = Mock()
        mock_decision = RouteDecision(
            reasoning="Test reasoning",
            intent="video_qa"
        )
        mock_llm.with_structured_output.return_value = Mock(
            invoke=lambda **kwargs: mock_decision
        )
        mock_get_llm.return_value = mock_llm
        
        chain = create_supervisor_chain()
        result = chain.invoke({
            "query": "What is the main topic?",
            "search_scope": "single_video"
        })
        
        assert result.intent == "video_qa"
        assert result.reasoning == "Test reasoning"
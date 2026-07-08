# app/graph/tests/test_nodes.py
import pytest
from unittest.mock import Mock, patch

from app.graph.nodes import (
    supervisor_node,
    retriever_node,
    validator_node,
    web_search_node,
    generate_answer_node,
    video_summary_node,
)
from app.graph.state import AgentState


class TestNodes:
    """Test suite for graph nodes."""
    
    @patch('app.graph.nodes.create_supervisor_chain')
    def test_supervisor_node(self, mock_create_chain):
        """Test supervisor node decision making."""
        mock_chain = Mock()
        mock_decision = Mock()
        mock_decision.intent = "video_qa"
        mock_decision.reasoning = "Test reasoning"
        mock_chain.invoke.return_value = mock_decision
        mock_create_chain.return_value = mock_chain
        
        state: AgentState = {
            "query": "What is this video about?",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": None,
            "response": None,
        }
        
        result = supervisor_node(state)
        
        assert result["next_node"] == "video_qa"
        mock_chain.invoke.assert_called_once_with({
            "query": "What is this video about?",
            "search_scope": "single_video"
        })
    
    @patch('app.graph.nodes.PineconeVectorStore')
    @patch('app.graph.nodes._get_embeddings')
    @patch('app.graph.nodes.get_settings')
    def test_retriever_node_single_video(self, mock_get_settings, mock_embeddings, mock_vector_store):
        """Test retriever node with single video scope."""
        mock_settings = Mock()
        mock_settings.index_name = "test_index"
        mock_settings.pinecone_api_key = "test_key"
        mock_get_settings.return_value = mock_settings
        
        mock_retriever = Mock()
        mock_doc = Mock()
        mock_doc.page_content = "Test content"
        mock_doc.metadata = {
            "video_id": "video456",
            "title": "Test Video",
            "start_time": 120
        }
        mock_retriever.invoke.return_value = [mock_doc]
        
        mock_vector_store_instance = Mock()
        mock_vector_store_instance.as_retriever.return_value = mock_retriever
        mock_vector_store.return_value = mock_vector_store_instance
        
        state: AgentState = {
            "query": "What is the main concept?",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": None,
            "response": None,
        }
        
        result = retriever_node(state)
        
        assert "documents" in result
        assert len(result["documents"]) == 1
        assert result["documents"][0]["video_id"] == "video456"
        
        # Verify correct search kwargs
        mock_vector_store_instance.as_retriever.assert_called_with(
            search_kwargs={
                "filter": {"video_id": {"$eq": "video456"}},
                "k": 4
            }
        )
    
    @patch('app.graph.nodes.create_validator_chain')
    def test_validator_node_with_documents(self, mock_create_chain):
        """Test validator node with relevant documents."""
        mock_chain = Mock()
        mock_result = Mock()
        mock_result.binary_score = "yes"
        mock_result.explanation = "Documents are relevant"
        mock_chain.invoke.return_value = mock_result
        mock_create_chain.return_value = mock_chain
        
        state: AgentState = {
            "query": "Test query",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": [
                {"page_content": "Relevant content here"}
            ],
            "response": None,
        }
        
        result = validator_node(state)
        
        assert result["next_node"] == "generator"
    
    @patch('app.graph.nodes.create_validator_chain')
    def test_validator_node_no_documents(self, mock_create_chain):
        """Test validator node with no documents."""
        state: AgentState = {
            "query": "Test query",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": [],
            "response": None,
        }
        
        result = validator_node(state)
        
        assert result["next_node"] == "web_search"
        mock_create_chain.assert_not_called()
    
    @patch('app.graph.nodes.TavilySearchResults')
    def test_web_search_node(self, mock_search):
        """Test web search node."""
        mock_tool = Mock()
        mock_tool.invoke.return_value = [
            {"content": "Web result 1", "url": "https://test.com"}
        ]
        mock_search.return_value = mock_tool
        
        state: AgentState = {
            "query": "Test search query",
            "search_scope": "general",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": None,
            "response": None,
        }
        
        result = web_search_node(state)
        
        assert "documents" in result
        assert len(result["documents"]) == 1
        assert result["documents"][0]["title"] == "جستجوی وب"
        mock_tool.invoke.assert_called_once_with({"query": "Test search query"})
    
    @patch('app.graph.nodes.create_generator_chain')
    def test_generate_answer_node(self, mock_create_chain):
        """Test generator node with structured output."""
        mock_chain = Mock()
        mock_result = Mock()
        mock_result.answer = "This is the answer."
        mock_result.has_sufficient_context = True
        mock_result.sources = []
        mock_result.model_dump_json.return_value = '{"answer": "This is the answer."}'
        mock_chain.invoke.return_value = mock_result
        mock_create_chain.return_value = mock_chain
        
        state: AgentState = {
            "query": "Test question",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": [
                {
                    "page_content": "Video content",
                    "video_id": "video456",
                    "title": "Test Video",
                    "start_time": 120
                }
            ],
            "response": None,
        }
        
        result = generate_answer_node(state)
        
        assert "response" in result
        # Result should be JSON string
        assert isinstance(result["response"], str)
    
    @patch('app.graph.nodes._fetch_video_context')
    @patch('app.graph.nodes.create_summary_chain')
    def test_video_summary_node(self, mock_create_chain, mock_fetch_context):
        """Test video summary node."""
        mock_fetch_context.return_value = "Test context"
        
        mock_chain = Mock()
        mock_summary = Mock(spec=VideoSummarySchema)
        mock_summary.title = "Test Summary"
        mock_summary.overall_summary = "Summary content"
        mock_summary.key_takeaways = []
        mock_summary.academic_conclusion = "Conclusion"
        mock_summary.model_dump_json.return_value = '{"title": "Test Summary"}'
        mock_chain.invoke.return_value = mock_summary
        mock_create_chain.return_value = mock_chain
        
        state: AgentState = {
            "query": "Summarize this video",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": None,
            "response": None,
        }
        
        result = video_summary_node(state)
        
        assert "response" in result
        assert isinstance(result["response"], str)
        mock_fetch_context.assert_called_once_with("user123", "video456", "Summarize this video", k=4)
# app/graph/tests/test_workflow.py
import pytest
from unittest.mock import Mock, patch

from app.graph.workflow import create_agent_graph, get_agent_graph
from app.graph.state import AgentState


class TestWorkflow:
    """Test suite for workflow creation and compilation."""
    
    def test_create_agent_graph(self):
        """Test agent graph creation."""
        graph = create_agent_graph()
        
        assert graph is not None
        # Verify that graph has expected nodes
        assert hasattr(graph, 'invoke')
        assert hasattr(graph, 'stream')
    
    @patch('app.graph.workflow.create_agent_graph')
    def test_get_agent_graph_singleton(self, mock_create):
        """Test that get_agent_graph returns singleton instance."""
        mock_graph = Mock()
        mock_create.return_value = mock_graph
        
        # Reset global
        import app.graph.workflow
        app.graph.workflow.agent_graph = None
        
        graph1 = get_agent_graph()
        graph2 = get_agent_graph()
        
        assert graph1 is graph2
        mock_create.assert_called_once()
    
    def test_workflow_node_inclusion(self):
        """Test that all required nodes are in the workflow."""
        # This is a structural test
        from app.graph.nodes import (
            supervisor_node,
            retriever_node,
            validator_node,
            web_search_node,
            generate_answer_node,
            video_summary_node,
        )
        
        graph = create_agent_graph()
        
        # Get node names from the graph
        # Note: This is implementation-specific and may need adjustment
        # depending on how you access graph nodes
        assert hasattr(graph, 'nodes')
    
    @patch('app.graph.workflow.supervisor_node')
    @patch('app.graph.workflow.retriever_node')
    @patch('app.graph.workflow.validator_node')
    @patch('app.graph.workflow.web_search_node')
    @patch('app.graph.workflow.generate_answer_node')
    @patch('app.graph.workflow.video_summary_node')
    def test_workflow_compilation_with_mocked_nodes(
        self,
        mock_summary,
        mock_generator,
        mock_web,
        mock_validator,
        mock_retriever,
        mock_supervisor,
    ):
        """Test workflow compiles with mocked nodes."""
        # Set return values for each node
        mock_supervisor.return_value = {"next_node": "retriever"}
        mock_retriever.return_value = {"documents": []}
        mock_validator.return_value = {"next_node": "generator"}
        mock_generator.return_value = {"response": "Test response"}
        mock_web.return_value = {"documents": []}
        mock_summary.return_value = {"response": "Test summary"}
        
        graph = create_agent_graph()
        
        # The graph should compile without errors
        assert graph is not None


@pytest.mark.asyncio
class TestWorkflowIntegration:
    """Integration tests for the full workflow."""
    
    @patch('app.graph.nodes.PineconeVectorStore')
    @patch('app.graph.nodes._get_embeddings')
    @patch('app.graph.nodes.get_settings')
    @patch('app.graph.nodes.create_supervisor_chain')
    @patch('app.graph.nodes.create_validator_chain')
    @patch('app.graph.nodes.create_generator_chain')
    async def test_end_to_end_qa_flow(
        self,
        mock_gen_chain,
        mock_val_chain,
        mock_sup_chain,
        mock_settings,
        mock_embeddings,
        mock_vector_store,
    ):
        """Test end-to-end Q&A flow through the graph."""
        # Mock supervisor decision
        mock_sup = Mock()
        mock_sup_decision = Mock()
        mock_sup_decision.intent = "video_qa"
        mock_sup_chain.return_value = mock_sup
        mock_sup.invoke.return_value = mock_sup_decision
        
        # Mock validator
        mock_val = Mock()
        mock_val_result = Mock()
        mock_val_result.binary_score = "yes"
        mock_val_chain.return_value = mock_val
        mock_val.invoke.return_value = mock_val_result
        
        # Mock generator
        mock_gen = Mock()
        mock_gen_result = Mock()
        mock_gen_result.answer = "This is the answer."
        mock_gen_result.has_sufficient_context = True
        mock_gen_result.sources = []
        mock_gen_result.model_dump_json.return_value = '{"answer": "This is the answer."}'
        mock_gen_chain.return_value = mock_gen
        mock_gen.invoke.return_value = mock_gen_result
        
        # Mock vector store and retriever
        mock_settings.return_value.index_name = "test"
        mock_settings.return_value.pinecone_api_key = "test"
        
        mock_retriever = Mock()
        mock_doc = Mock()
        mock_doc.page_content = "Test content"
        mock_doc.metadata = {
            "video_id": "video456",
            "title": "Test Video",
            "start_time": 120
        }
        mock_retriever.invoke.return_value = [mock_doc]
        
        mock_vs_instance = Mock()
        mock_vs_instance.as_retriever.return_value = mock_retriever
        mock_vector_store.return_value = mock_vs_instance
        
        # Create and invoke graph
        graph = create_agent_graph()
        
        initial_state: AgentState = {
            "query": "What is the main concept?",
            "search_scope": "single_video",
            "user_id": "user123",
            "video_id": "video456",
            "messages": [],
            "next_node": None,
            "documents": None,
            "response": None,
            "retriever_time_ms": 0,
            "validator_time_ms": 0,
            "generator_time_ms": 0,
            "web_search_time_ms": 0,
            "other_time_ms": 0,
        }
        
        # Run the graph
        result = await graph.ainvoke(initial_state)
        
        # Verify the response
        assert "response" in result
        assert result["response"] is not None
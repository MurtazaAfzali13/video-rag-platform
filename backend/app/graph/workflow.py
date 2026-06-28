import logging

from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    is_summary_request,
    video_rag_node,
    video_summary_node,
    multi_video_search_node ,
)

from app.graph.state import AgentState

logger = logging.getLogger(__name__)


def routing_edge(state: AgentState) -> str:
    """Route to video summary, video RAG, or web search based on state."""
    if state.get("video_id"):
        if is_summary_request(state.get("query", "")):
            return "video_summary"
        return "video_rag"
    return "web_search"


def create_agent_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("video_rag", video_rag_node)
    workflow.add_node("video_summary", video_summary_node)
    workflow.add_node("web_search", multi_video_search_node)

    workflow.set_conditional_entry_point(
        routing_edge,
        {
            "video_rag": "video_rag",
            "video_summary": "video_summary",
            "web_search": "web_search",
        },
    )

    workflow.add_edge("video_rag", END)
    workflow.add_edge("video_summary", END)
    workflow.add_edge("web_search", END)

    return workflow.compile()


try:
    agent_graph = create_agent_graph()
except Exception as e:
    logger.error("Failed to initialize Agent Graph eagerly: %s", e)
    agent_graph = None


def get_agent_graph():
    """Return the compiled graph, creating it on first use if needed."""
    global agent_graph
    if agent_graph is None:
        agent_graph = create_agent_graph()
    return agent_graph


if __name__ == "__main__":
    print("Inializing graph")
import logging
from langgraph.graph import END, StateGraph

from app.graph.nodes import (
    contextualize_node,
    supervisor_node,
    retriever_node,
    reranker_node,
    validator_node,
    web_search_node,
    generate_answer_node,
    video_summary_node,
)
from app.graph.state import AgentState

logger = logging.getLogger(__name__)


def route_from_supervisor(state: AgentState) -> str:
    """Read the supervisor's decision from state to route the graph."""
    intent = state.get("next_node")

    if intent == "video_summary":
        return "video_summary"

    return "retriever"


def route_from_validator(state: AgentState) -> str:
    """Route to generator or web_search based on validator's quality check."""
    decision = state.get("next_node")

    if decision == "web_search":
        return "web_search"

    return "generator"


def create_agent_graph():
    workflow = StateGraph(AgentState)

    workflow.add_node("contextualize", contextualize_node)
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("retriever", retriever_node)
    workflow.add_node("reranker", reranker_node)
    workflow.add_node("validator", validator_node)
    workflow.add_node("web_search", web_search_node)
    workflow.add_node("generator", generate_answer_node)
    workflow.add_node("video_summary", video_summary_node)

    # New entry point: every request is history-resolved first.
    workflow.set_entry_point("contextualize")
    workflow.add_edge("contextualize", "supervisor")

    workflow.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "video_summary": "video_summary",
            "retriever": "retriever",
        },
    )

    # retriever -> reranker -> validator (reranker trims noise BEFORE grading)
    workflow.add_edge("retriever", "reranker")
    workflow.add_edge("reranker", "validator")

    workflow.add_conditional_edges(
        "validator",
        route_from_validator,
        {
            "generator": "generator",
            "web_search": "web_search",
        },
    )

    workflow.add_edge("web_search", "generator")

    workflow.add_edge("generator", END)
    workflow.add_edge("video_summary", END)

    return workflow.compile()


try:
    agent_graph = create_agent_graph()
    logger.info("Agent Graph initialized successfully.")
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
    print("Initializing graph...")
    graph = get_agent_graph()
    print("Graph compiled successfully!")
    try:
        png_data = graph.get_graph().draw_mermaid_png()
        
        output_file = "agent_architecture.png"
        with open(output_file, "wb") as f:
            f.write(png_data)
            
        print(f"Graph image successfully saved as '{output_file}'")
        
    except Exception as e:
        print(f"Failed to generate or save graph image: {e}")
        print("Note: draw_mermaid_png() requires an active internet connection as it uses the Mermaid.ink API by default.")
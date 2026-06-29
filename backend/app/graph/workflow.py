import logging
from langgraph.graph import END, StateGraph


from app.graph.nodes import (
    supervisor_node,
    retriever_node,
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

    
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("retriever", retriever_node)
    workflow.add_node("validator", validator_node)
    workflow.add_node("web_search", web_search_node)
    workflow.add_node("generator", generate_answer_node)
    workflow.add_node("video_summary", video_summary_node)

    
    workflow.set_entry_point("supervisor")
    workflow.add_conditional_edges(
        "supervisor",
        route_from_supervisor,
        {
            "video_summary": "video_summary",
            "retriever": "retriever",
        },
    )

    
    workflow.add_edge("retriever", "validator")
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
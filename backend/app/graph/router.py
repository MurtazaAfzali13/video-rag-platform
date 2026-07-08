# app/graph/router.py
from app.graph.state import AgentState


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
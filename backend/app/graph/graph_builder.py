"""
Graph Builder - Assembles the LangGraph StateGraph.

Architecture:
    START → Supervisor → [Planning / Discovery / Budget] → Synthesizer → END
"""
import logging
from langgraph.graph import StateGraph, END
from app.graph.state import TripState
from app.agents.supervisor import supervisor_node
from app.agents.planning_agent import planning_agent_node
from app.agents.discovery_agent import discovery_agent_node
from app.agents.budget_agent import budget_agent_node
from app.agents.synthesizer_agent import synthesizer_node

logger = logging.getLogger(__name__)


def route_after_supervisor(state: TripState) -> str:
    """After supervisor runs, route to the first agent or synthesizer."""
    if state.get("final_response"):
        logger.info("[Router] Direct response set, routing to synthesizer")
        return "synthesizer"

    plan = state.get("execution_plan", [])
    if not plan:
        logger.info("[Router] Empty plan, routing to synthesizer")
        return "synthesizer"

    next_agent = plan[0]
    logger.info(f"[Router] Routing to first agent: {next_agent}")
    return next_agent


def route_next_agent(state: TripState) -> str:
    """After an agent completes, route to the next agent or synthesizer."""
    plan = state.get("execution_plan", [])
    current_index = state.get("current_agent_index", 0)

    if current_index >= len(plan):
        logger.info("[Router] All agents completed, routing to synthesizer")
        return "synthesizer"

    next_agent = plan[current_index]
    logger.info(f"[Router] Routing to next agent: {next_agent} (index {current_index})")
    return next_agent


def build_graph() -> StateGraph:
    """Build and compile the LangGraph state graph."""
    graph = StateGraph(TripState)

    graph.add_node("supervisor", supervisor_node)
    graph.add_node("planning", planning_agent_node)
    graph.add_node("discovery", discovery_agent_node)
    graph.add_node("budget", budget_agent_node)
    graph.add_node("synthesizer", synthesizer_node)

    graph.set_entry_point("supervisor")

    graph.add_conditional_edges(
        "supervisor",
        route_after_supervisor,
        {
            "planning": "planning",
            "discovery": "discovery",
            "budget": "budget",
            "synthesizer": "synthesizer",
        },
    )

    for agent_name in ["planning", "discovery", "budget"]:
        graph.add_conditional_edges(
            agent_name,
            route_next_agent,
            {
                "planning": "planning",
                "discovery": "discovery",
                "budget": "budget",
                "synthesizer": "synthesizer",
            },
        )

    graph.add_edge("synthesizer", END)

    return graph.compile()


voyager_graph = build_graph()
logger.info("LangGraph compiled successfully.")

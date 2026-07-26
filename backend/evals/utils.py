"""
Utility functions for the evaluation framework.
Handles dataset loading, synthetic state construction, and tool/agent instrumentation.
"""
import json
import os
import time
import logging
from typing import List, Dict, Any
from contextlib import contextmanager

from evals.models import EvalTestCase

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Dataset Loading
# ──────────────────────────────────────────────

def load_dataset(filepath: str) -> List[EvalTestCase]:
    """Load and validate a JSON dataset file into EvalTestCase objects."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset not found: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        raw = json.load(f)

    test_cases = []
    for item in raw:
        try:
            tc = EvalTestCase(**item)
            test_cases.append(tc)
        except Exception as e:
            logger.warning(f"Skipping invalid test case {item.get('id', '?')}: {e}")

    logger.info(f"Loaded {len(test_cases)} test cases from {os.path.basename(filepath)}")
    return test_cases


def load_all_datasets(datasets_dir: str) -> List[EvalTestCase]:
    """Load all dataset files from the datasets directory."""
    all_cases = []
    dataset_files = ["routing.json", "multi_agent.json", "edge_cases.json"]

    for filename in dataset_files:
        filepath = os.path.join(datasets_dir, filename)
        if os.path.exists(filepath):
            cases = load_dataset(filepath)
            all_cases.extend(cases)
        else:
            logger.warning(f"Dataset file not found: {filepath}")

    return all_cases


# ──────────────────────────────────────────────
# Synthetic State Construction
# ──────────────────────────────────────────────

DEFAULT_TRIP = {
    "id": "eval-trip-001",
    "destination": "Paris, France",
    "start_date": "2026-08-01",
    "end_date": "2026-08-07",
    "budget": 2000,
    "currency": "USD",
    "interests": "sightseeing, food, culture",
}


def build_test_state(test_case: EvalTestCase) -> Dict[str, Any]:
    """
    Build a realistic TripState dictionary for a test case.
    Uses default trip context unless the test case overrides it.
    """
    trip = dict(DEFAULT_TRIP)
    if test_case.trip_context:
        trip.update(test_case.trip_context)

    state = {
        "user_query": test_case.query,
        "execution_plan": [],
        "current_agent_index": 0,
        "trip": trip,
        "active_location": trip.get("destination", "Paris, France"),
        "destination_update": None,
        "itinerary": None,
        "weather": None,
        "nearby_places": None,
        "expenses": [],
        "remaining_budget": float(trip.get("budget", 2000)),
        "budget_update": None,
        "new_expense": None,
        "recommendations": [],
        "user_preferences": {
            "food_preference": "local cuisine",
            "travel_style": "balanced",
            "favorite_categories": [],
        },
        "preference_update": None,
        "insights": None,
        "conversation_history": [],
        "final_response": None,
    }

    return state


# ──────────────────────────────────────────────
# Tool Invocation Tracking
# ──────────────────────────────────────────────

class ToolTracker:
    """Tracks which tools are invoked during graph execution via monkey-patching."""

    def __init__(self):
        self.invoked_tools: List[str] = []
        self._original_invokes: Dict[str, Any] = {}
        self._tools = []

    def start_tracking(self):
        """Patch tool .invoke() methods to record calls.

        LangChain tools are Pydantic models, so we use object.__setattr__
        to bypass field validation when monkey-patching.
        """
        try:
            from app.tools.weather_tool import get_weather
            from app.tools.attractions_tool import get_attractions
            from app.tools.route_tool import optimize_route
            from app.tools.geocode_tool import geocode_destination
            from app.tools.nearby_tool import search_nearby_places
            from app.tools.currency_tool import convert_currency
            from app.tools.budget_tool import calculate_budget

            self._tools = [
                ("get_weather", get_weather),
                ("get_attractions", get_attractions),
                ("optimize_route", optimize_route),
                ("geocode_destination", geocode_destination),
                ("search_nearby_places", search_nearby_places),
                ("convert_currency", convert_currency),
                ("calculate_budget", calculate_budget),
            ]

            for name, tool in self._tools:
                original = tool.invoke
                self._original_invokes[name] = original

                def make_wrapper(tool_name, orig_fn):
                    def wrapper(*args, **kwargs):
                        self.invoked_tools.append(tool_name)
                        return orig_fn(*args, **kwargs)
                    return wrapper

                # Use object.__setattr__ to bypass Pydantic field validation
                object.__setattr__(tool, "invoke", make_wrapper(name, original))

        except ImportError as e:
            logger.warning(f"Could not import tools for tracking: {e}")

    def stop_tracking(self):
        """Restore original .invoke() methods."""
        for name, tool in self._tools:
            if name in self._original_invokes:
                object.__setattr__(tool, "invoke", self._original_invokes[name])
        self._original_invokes.clear()

    def get_invoked(self) -> List[str]:
        """Return list of tool names that were invoked."""
        return list(self.invoked_tools)

    def reset(self):
        """Clear the invocation log."""
        self.invoked_tools.clear()


@contextmanager
def track_tools():
    """Context manager for tool tracking."""
    tracker = ToolTracker()
    tracker.start_tracking()
    try:
        yield tracker
    finally:
        tracker.stop_tracking()


# ──────────────────────────────────────────────
# Agent Timing via Instrumented Graph
# ──────────────────────────────────────────────

def build_eval_graph(timing: Dict[str, float]):
    """
    Build an instrumented copy of the Voyager graph that records
    per-node execution time. This does NOT modify the production graph.
    """
    from langgraph.graph import StateGraph, END
    from app.graph.state import TripState
    from app.agents.supervisor import supervisor_node
    from app.agents.planning_agent import planning_agent_node
    from app.agents.discovery_agent import discovery_agent_node
    from app.agents.budget_agent import budget_agent_node
    from app.agents.synthesizer_agent import synthesizer_node
    from app.graph.graph_builder import route_after_supervisor, route_next_agent

    def timed(name, fn):
        def wrapper(state):
            start = time.time()
            result = fn(state)
            timing[name] = time.time() - start
            return result
        return wrapper

    graph = StateGraph(TripState)
    graph.add_node("supervisor", timed("supervisor", supervisor_node))
    graph.add_node("planning", timed("planning", planning_agent_node))
    graph.add_node("discovery", timed("discovery", discovery_agent_node))
    graph.add_node("budget", timed("budget", budget_agent_node))
    graph.add_node("synthesizer", timed("synthesizer", synthesizer_node))

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


# ──────────────────────────────────────────────
# Output Helpers
# ──────────────────────────────────────────────

def ensure_output_dir(output_dir: str):
    """Create the output directory if it doesn't exist."""
    os.makedirs(output_dir, exist_ok=True)

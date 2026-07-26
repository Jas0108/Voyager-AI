"""
Supervisor Agent — routes requests to specialist agents.
"""
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import TripState
from app.prompts.supervisor_prompt import SUPERVISOR_SYSTEM_PROMPT
from app.services.llm_service import llm_service
from app.utils.query_parser import (
    is_weather_query,
    is_discovery_query,
    is_sightseeing_query,
    is_budget_query,
    is_itinerary_modification_query,
    parse_budget_update,
    parse_expense,
    _contains_keyword,
    AMENITY_KEYWORDS,
    ITINERARY_KEYWORDS,
)

logger = logging.getLogger(__name__)

VALID_AGENTS = {"planning", "discovery", "budget"}


def _fallback_routing(state: TripState) -> list[str]:
    """Keyword-based routing when LLM JSON parsing fails."""
    query = state["user_query"]
    history = state.get("conversation_history", [])
    plan = []

    # Routing to planning agent
    if is_sightseeing_query(query) or is_itinerary_modification_query(query) or is_weather_query(query, history) or _contains_keyword(query, ITINERARY_KEYWORDS):
        plan.append("planning")

    # Check if query is a pure expense update or pure itinerary edit
    query_lower = query.lower()
    explicit_discovery_intent = any(k in query_lower for k in ["find", "suggest", "recommend", "nearby", "search"])
    is_pure_expense = (parse_expense(query) is not None or parse_budget_update(query) is not None) and not explicit_discovery_intent
    is_pure_itinerary_mod = is_itinerary_modification_query(query) and not explicit_discovery_intent

    if is_discovery_query(query, history) and not is_pure_expense and not is_pure_itinerary_mod and "discovery" not in plan:
        plan.append("discovery")

    if (is_budget_query(query) or parse_budget_update(query) or parse_expense(query)) and "budget" not in plan:
        plan.append("budget")

    # Queries that mention both itinerary AND budget should route to both
    has_itinerary_ref = any(k in query_lower for k in ["itinerary", "planned", "trip plan", "everything planned"])
    has_budget_ref = any(k in query_lower for k in ["budget", "afford", "money", "cost", "enough"])
    if has_itinerary_ref and has_budget_ref:
        if "planning" not in plan: plan.append("planning")
        if "budget" not in plan: plan.append("budget")

    # Only check for amenity keywords if no plan was found yet
    if not plan and any(any(k in query_lower for k in keywords) for keywords in AMENITY_KEYWORDS.values()):
        plan.append("discovery")

    return plan


def supervisor_node(state: TripState) -> dict:
    logger.info(f"[Supervisor] Analyzing query: {state['user_query']}")

    history_text = ""
    for msg in state.get("conversation_history", [])[-6:]:
        role = "You" if msg["role"] == "assistant" else msg["role"].capitalize()
        history_text += f"{role}: {msg['content']}\n"

    user_message = f"Conversation so far:\n{history_text}\nCurrent message from user: {state['user_query']}" if history_text else f"User: {state['user_query']}"

    messages = [
        SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT),
        HumanMessage(content=user_message),
    ]

    result = llm_service.invoke_json(messages)

    if result and "execution_plan" in result:
        raw_plan = result["execution_plan"]
        execution_plan = [agent for agent in raw_plan if agent in VALID_AGENTS]

        direct_response = result.get("direct_response")
        if not execution_plan and direct_response:
            # Don't short-circuit weather/location/sightseeing/budget queries with generic answers
            query = state["user_query"]
            query_lower = query.lower()
            history = state.get("conversation_history", [])

            # Detect combo: itinerary + budget queries
            has_itinerary_ref = any(k in query_lower for k in ["itinerary", "planned", "trip plan", "everything planned"])
            has_budget_ref = is_budget_query(query)
            if has_itinerary_ref and has_budget_ref:
                execution_plan = ["planning", "budget"]
            elif is_weather_query(query, history):
                execution_plan = ["planning"]
            elif is_sightseeing_query(query):
                execution_plan = ["planning"]
            elif is_itinerary_modification_query(query):
                execution_plan = ["planning"]
            elif is_discovery_query(query, history):
                execution_plan = ["discovery"]
            elif has_budget_ref:
                execution_plan = ["budget"]
            else:
                logger.info("[Supervisor] Direct response (no agents needed)")
                return {
                    "execution_plan": [],
                    "current_agent_index": 0,
                    "final_response": direct_response,
                    "preference_update": result.get("preference_update") if isinstance(result, dict) else None,
                }

        if not execution_plan:
            execution_plan = _fallback_routing(state)
    else:
        logger.warning("[Supervisor] Failed to parse execution plan, using keyword fallback")
        execution_plan = _fallback_routing(state)

    logger.info(f"[Supervisor] Execution plan: {execution_plan}")

    return {
        "execution_plan": execution_plan,
        "current_agent_index": 0,
        "preference_update": result.get("preference_update") if isinstance(result, dict) else None,
    }

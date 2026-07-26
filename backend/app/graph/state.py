"""
LangGraph Shared State definition.
TripState is the single source of truth shared across all agents.
Agents communicate ONLY through this state - never directly with each other.
"""
from typing import TypedDict, List, Dict, Any, Optional


class TripState(TypedDict):
    # The original user message
    user_query: str

    # Decided by Supervisor - list of agents to run in order
    execution_plan: List[str]

    # Current position in the execution plan
    current_agent_index: int

    # Trip data loaded from database
    trip: Dict[str, Any]

    # Resolved city for this request (from query, chat history, or trip)
    active_location: Optional[str]
    destination_update: Optional[str]

    # Planning Agent outputs
    itinerary: Optional[List[Dict[str, Any]]]
    weather: Optional[Dict[str, Any]]

    # Discovery Agent outputs
    nearby_places: Optional[List[Dict[str, Any]]]

    # Budget Agent outputs
    expenses: Optional[List[Dict[str, Any]]]
    remaining_budget: Optional[float]
    budget_update: Optional[float]
    new_expense: Optional[Dict[str, Any]]

    # Shared recommendations from any agent
    recommendations: Optional[List[str]]

    # User Preferences
    user_preferences: Optional[Dict[str, Any]]
    preference_update: Optional[Dict[str, Any]]
    
    # Insights generated from state
    insights: Optional[Dict[str, Any]]

    # Conversation history for context
    conversation_history: List[Dict[str, str]]

    # Final synthesized response shown to user
    final_response: Optional[str]

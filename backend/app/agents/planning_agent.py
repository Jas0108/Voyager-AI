"""
Planning Agent.
Handles trip itineraries, weather queries, and sightseeing recommendations
using the resolved active location.
"""
import json
import logging
from datetime import datetime, timedelta
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from app.graph.state import TripState
from app.prompts.planning_prompt import PLANNING_SYSTEM_PROMPT
from app.services.llm_service import llm_service
from app.services.weather_service import weather_service
from app.tools.weather_tool import get_weather
from app.tools.attractions_tool import get_attractions
from app.tools.route_tool import optimize_route
from app.utils.async_utils import run_sync
from app.utils.query_parser import is_weather_query, is_itinerary_query, is_sightseeing_query, is_itinerary_modification_query
from app.utils.location_resolver import resolve_location, extract_location_from_text

logger = logging.getLogger(__name__)

PLANNING_TOOLS = [get_weather, get_attractions, optimize_route]


def _is_itinerary_stale(itinerary: list, current_destination: str) -> bool:
    """Check whether an existing itinerary was built for a different destination.

    Inspects location fields in itinerary activities. If none of them reference
    the current destination, the itinerary is stale and must be regenerated.
    """
    if not itinerary or not current_destination:
        return False

    dest_lower = current_destination.lower().replace(",", "").strip()
    # Also check the first word (city name) for partial matches like "Mumbai, India"
    dest_city = dest_lower.split(",")[0].split()[0] if dest_lower else ""

    for day in itinerary:
        for period in ("morning", "afternoon", "evening"):
            activity = day.get(period, {})
            if isinstance(activity, dict):
                loc = (activity.get("location") or "").lower()
                act = (activity.get("activity") or "").lower()
                if dest_city and (dest_city in loc or dest_city in act):
                    return False  # itinerary references current destination

    # None of the activities mention the current destination → stale
    logger.info(f"[PlanningAgent] No reference to '{current_destination}' found in itinerary activities")
    return True

def _get_search_location(state: TripState) -> str:
    # Similar logic to discovery agent - prioritize trip destination
    trip = state.get("trip", {})
    trip_destination = trip.get("destination", "Unknown")
    
    # Normalize trip destination for comparison
    trip_normalized = trip_destination.lower().replace(" ", "").replace(",", "")
    
    # Only use a different location if user explicitly mentions a different city in the query
    query_location = extract_location_from_text(state["user_query"])
    
    if query_location:
        query_normalized = query_location.lower().replace(" ", "").replace(",", "")
        # Check if the query location is actually different from the trip destination
        if query_normalized not in trip_normalized and trip_normalized not in query_normalized:
            # User explicitly asked for a different location
            logger.info(f"[PlanningAgent] User requested different location: {query_location} vs trip: {trip_destination}")
            return query_location
    
    # Default to trip destination
    logger.info(f"[PlanningAgent] Using trip destination: {trip_destination}")
    return trip_destination


def _fetch_weather(location: str) -> dict:
    if not location or location.strip().lower() == "unknown":
        return {}
    try:
        current = run_sync(weather_service.get_current_weather(location))
        forecast = run_sync(weather_service.get_forecast(location))
        return {"current": current, "forecast": forecast, "location": location}
    except Exception as e:
        logger.error(f"[PlanningAgent] Weather fetch failed: {e}")
        return {"current": {"error": str(e), "destination": location}, "location": location}


def _fetch_attractions_data(location: str) -> list:
    """Fetch real attractions using the attractions tool."""
    try:
        result = get_attractions.invoke({"destination": location})
        if isinstance(result, dict):
            return result.get("attractions", [])
    except Exception as e:
        logger.error(f"[PlanningAgent] Attractions fetch failed: {e}")
    return []


def planning_agent_node(state: TripState) -> dict:
    logger.info("[PlanningAgent] Starting execution")
    trip = state.get("trip", {})
    location = _get_search_location(state)
    user_query = state["user_query"]
    history = state.get("conversation_history", [])
    existing_itinerary = state.get("itinerary")

    logger.info(f"[PlanningAgent] Using location: {location}")
    logger.info(f"[PlanningAgent] Existing itinerary: {'Yes' if existing_itinerary else 'No'}")

    trip_info = (
        f"Destination: {location}\n"
        f"Dates: {trip.get('start_date')} to {trip.get('end_date')}\n"
        f"Budget: {trip.get('budget')} {trip.get('currency', 'USD')}\n"
        f"Interests: {trip.get('interests', 'general sightseeing')}"
    )

    # ── Staleness check: regenerate if itinerary was built for a different destination ──
    if existing_itinerary and _is_itinerary_stale(existing_itinerary, location):
        logger.warning(
            f"[PlanningAgent] Itinerary is STALE — built for a different destination, "
            f"current destination is '{location}'. Forcing regeneration."
        )
        existing_itinerary = None  # force regeneration below

    # ── Detect if user wants to MODIFY a specific day vs regenerate the whole thing ──
    is_modification = is_itinerary_modification_query(user_query)
    
    # If itinerary already exists, only regenerate if user explicitly asks for it
    if existing_itinerary and not is_itinerary_query(user_query):
        logger.info("[PlanningAgent] Itinerary exists and user didn't ask to regenerate - preserving existing")
        # Still fetch weather if requested
        weather_data = _fetch_weather(location)
        weather_only = is_weather_query(user_query, history)
        
        if weather_only:
            recs = []
            current = weather_data.get("current", {})
            if current and not current.get("error"):
                recs.append(f"Current conditions in {location}: {current.get('description')}.")
            elif current.get("error"):
                recs.append(f"Could not fetch weather for {location}: {current.get('error')}")
            return {
                "weather": weather_data,
                "active_location": location,
                "recommendations": state.get("recommendations", []) + recs,
                "current_agent_index": state.get("current_agent_index", 0) + 1,
            }
        
        # Return existing itinerary without modification
        return {
            "itinerary": existing_itinerary,
            "weather": weather_data if weather_data else {},
            "active_location": location,
            "recommendations": state.get("recommendations", []),
            "current_agent_index": state.get("current_agent_index", 0) + 1,
        }

    weather_data = _fetch_weather(location)
    weather_only = is_weather_query(user_query, history) and not is_itinerary_query(user_query) and not is_sightseeing_query(user_query)

    if weather_only:
        logger.info("[PlanningAgent] Weather-only query")
        recs = []
        current = weather_data.get("current", {})
        if current and not current.get("error"):
            recs.append(
                f"Current conditions in {location}: {current.get('description')}."
            )
        elif current.get("error"):
            recs.append(f"Could not fetch weather for {location}: {current.get('error')}")
        return {
            "weather": weather_data,
            "active_location": location,
            "recommendations": state.get("recommendations", []) + recs,
            "current_agent_index": state.get("current_agent_index", 0) + 1,
        }

    llm = llm_service.get_llm()
    if not llm:
        return _fallback_itinerary(state, location, trip, weather_data)

    try:
        llm_with_tools = llm.bind_tools(PLANNING_TOOLS)
        
        # ── Build the user message with existing itinerary context for modifications ──
        budget_info = ""
        if state.get("remaining_budget") is not None:
            budget_info = f"Remaining Budget: {state['remaining_budget']} {trip.get('currency', 'USD')}"
            
        user_content = (
            f"Trip Info:\n{trip_info}\n\n"
            f"User Preferences:\n{state.get('user_preferences', {})}\n\n"
            f"Budget Information:\n{budget_info}\n\n"
            f"User Query: {user_query}"
        )
        
        if is_modification and existing_itinerary:
            logger.info(f"[PlanningAgent] MODIFICATION request detected. Passing existing {len(existing_itinerary)}-day itinerary to LLM.")
            itinerary_text = _format_itinerary_for_llm(existing_itinerary)
            user_content = (
                f"Trip Info:\n{trip_info}\n\n"
                f"EXISTING ITINERARY (the user already has this {len(existing_itinerary)}-day itinerary):\n"
                f"{itinerary_text}\n\n"
                f"MODIFICATION REQUEST: {user_query}\n\n"
                f"IMPORTANT: The user wants to MODIFY only the specific day/part mentioned above. "
                f"Keep ALL other days EXACTLY as they are. Only change what the user asked to change. "
                f"Return the COMPLETE itinerary (all {len(existing_itinerary)} days) with the requested modification applied."
            )
        
        messages = [
            SystemMessage(content=PLANNING_SYSTEM_PROMPT),
            HumanMessage(content=user_content),
        ]

        # Tool-calling loop: let the LLM call tools iteratively
        for _ in range(5):  # max iterations
            response = llm_with_tools.invoke(messages)
            messages.append(response)

            if not response.tool_calls:
                break  # LLM is done calling tools

            for tc in response.tool_calls:
                tool_map = {t.name: t for t in PLANNING_TOOLS}
                tool = tool_map.get(tc["name"])
                if tool:
                    try:
                        result = tool.invoke(tc["args"])
                        messages.append(ToolMessage(content=str(result), tool_call_id=tc["id"]))
                    except Exception as te:
                        messages.append(ToolMessage(content=f"Error: {te}", tool_call_id=tc["id"]))
                else:
                    messages.append(ToolMessage(content=f"Unknown tool: {tc['name']}", tool_call_id=tc["id"]))

        output = response.content if hasattr(response, 'content') else str(response)
        parsed = _parse_planning_output(output)
        
        # For modification requests, ensure we return the full itinerary
        result_itinerary = parsed.get("itinerary", [])
        if is_modification and existing_itinerary and not result_itinerary:
            # LLM didn't return structured itinerary — fall back to existing
            logger.warning("[PlanningAgent] Modification request but LLM didn't return structured itinerary. Preserving existing.")
            result_itinerary = existing_itinerary
        
        return {
            "itinerary": result_itinerary,
            "weather": weather_data or parsed.get("weather", {}),
            "active_location": location,
            "recommendations": state.get("recommendations", []) + parsed.get("recommendations", []),
            "current_agent_index": state.get("current_agent_index", 0) + 1,
        }
    except Exception as e:
        logger.error(f"[PlanningAgent] Error: {e}")
        return _fallback_itinerary(state, location, trip, weather_data)


def _format_itinerary_for_llm(itinerary: list) -> str:
    """Format an existing itinerary as readable text for the LLM to understand."""
    lines = []
    for day_data in itinerary:
        day_num = day_data.get("day", "?")
        date = day_data.get("date", "")
        lines.append(f"\n--- Day {day_num} ({date}) ---")
        for period in ("morning", "afternoon", "evening"):
            activity = day_data.get(period, {})
            if isinstance(activity, dict):
                act_name = activity.get("activity", "N/A")
                loc = activity.get("location", "")
                duration = activity.get("duration", "")
                tips = activity.get("tips", "")
                lines.append(f"  {period.capitalize()}: {act_name}")
                if loc:
                    lines.append(f"    Location: {loc}")
                if duration:
                    lines.append(f"    Duration: {duration}")
                if tips:
                    lines.append(f"    Tips: {tips}")
    return "\n".join(lines)


def _parse_planning_output(output: str) -> dict:
    try:
        start = output.find("{")
        end = output.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(output[start:end])
    except Exception:
        pass
    return {"itinerary": [], "recommendations": [output] if output else []}


def _fallback_itinerary(state: dict, location: str, trip: dict, weather_data: dict) -> dict:
    """Build a fallback itinerary using real attractions data when LLM is unavailable."""
    attractions = _fetch_attractions_data(location)
    interests = trip.get("interests", "").lower()
    
    # Calculate number of days
    try:
        start_date = datetime.strptime(trip.get("start_date", ""), "%Y-%m-%d")
        end_date = datetime.strptime(trip.get("end_date", ""), "%Y-%m-%d")
        num_days = max((end_date - start_date).days + 1, 1)
    except:
        num_days = 1
    
    logger.info(f"[PlanningAgent] Generating {num_days} day fallback itinerary for {location}")
    logger.info(f"[PlanningAgent] User interests: {interests}")

    itinerary = []
    
    if attractions and len(attractions) >= 3:
        # Use real attractions for the itinerary with variety
        sorted_attractions = sorted(attractions, key=lambda x: x.get("rating", 0), reverse=True)
        
        for day in range(1, num_days + 1):
            # Cycle through attractions with variety
            idx_morning = (day - 1) % len(sorted_attractions)
            idx_afternoon = (day) % len(sorted_attractions)
            idx_evening = (day + 1) % len(sorted_attractions)
            
            morning_attr = sorted_attractions[idx_morning]
            afternoon_attr = sorted_attractions[idx_afternoon]
            evening_attr = sorted_attractions[idx_evening]
            
            # Calculate date for this day
            try:
                day_date = (start_date + timedelta(days=day-1)).strftime("%Y-%m-%d")
            except:
                day_date = f"Day {day}"
            
            # Evening activity based on interests
            if "nightlife" in interests:
                evening_activity = f"Experience nightlife at {evening_attr['name']}"
                evening_tips = "Check for live music or special events"
            elif "food" in interests or "dining" in interests:
                evening_activity = f"Dining experience near {evening_attr['name']}"
                evening_tips = "Try local specialties and ask for recommendations"
            elif "shopping" in interests:
                evening_activity = f"Shopping near {evening_attr['name']}"
                evening_tips = "Look for local markets and boutiques"
            else:
                evening_activity = f"Visit {evening_attr['name']}"
                evening_tips = "Great for evening exploration"
            
            itinerary.append({
                "day": day,
                "date": day_date,
                "weather_note": _format_weather_note(weather_data),
                "morning": {
                    "activity": f"Visit {morning_attr['name']}",
                    "location": location,
                    "duration": "2-3 hours",
                    "tips": f"Arrive early for a less crowded experience at {morning_attr['name']}"
                },
                "afternoon": {
                    "activity": f"Explore {afternoon_attr['name']}",
                    "location": location,
                    "duration": "2-3 hours",
                    "tips": f"Great for photos and sightseeing at {afternoon_attr['name']}"
                },
                "evening": {
                    "activity": evening_activity,
                    "location": location,
                    "duration": "2 hours",
                    "tips": evening_tips
                },
            })
        
        recs = [f"Top attractions in {location}: " + ", ".join(a["name"] for a in sorted_attractions[:5])]
    else:
        # Minimal fallback with location-specific suggestions
        for day in range(1, num_days + 1):
            try:
                day_date = (start_date + timedelta(days=day-1)).strftime("%Y-%m-%d")
            except:
                day_date = f"Day {day}"
            
            itinerary.append({
                "day": day,
                "date": day_date,
                "weather_note": _format_weather_note(weather_data),
                "morning": {
                    "activity": f"Explore the main sights of {location}",
                    "location": f"{location} city center",
                    "duration": "3 hours",
                    "tips": "Start early to beat the crowds"
                },
                "afternoon": {
                    "activity": f"Visit museums and cultural landmarks in {location}",
                    "location": location,
                    "duration": "3 hours",
                    "tips": "Check opening hours in advance"
                },
                "evening": {
                    "activity": f"Experience {location}'s local dining and nightlife scene",
                    "location": location,
                    "duration": "2 hours",
                    "tips": "Ask locals for their favorite spots"
                },
            })
        recs = [f"I couldn't fetch specific attractions for {location}. Try asking me to find specific places like restaurants or cafes!"]

    return {
        "itinerary": itinerary,
        "weather": weather_data,
        "active_location": location,
        "recommendations": recs,
        "current_agent_index": state.get("current_agent_index", 0) + 1,
    }


def _format_weather_note(weather_data: dict) -> str:
    """Extract a brief weather note from weather data."""
    if not weather_data:
        return "Check local weather"
    current = weather_data.get("current", {})
    if current and not current.get("error"):
        desc = current.get("description", "")
        temp = current.get("temperature", "")
        if desc and temp:
            return f"{desc}, {temp}°C"
    return "Check local weather"

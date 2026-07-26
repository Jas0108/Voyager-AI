"""
Discovery Agent.
Finds nearby places using the resolved active location (from query or chat context).
"""
import json
import logging
import time
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from app.graph.state import TripState
from app.prompts.discovery_prompt import DISCOVERY_SYSTEM_PROMPT
from app.services.llm_service import llm_service
from app.services.places_service import places_service
from app.tools.geocode_tool import geocode_destination
from app.tools.nearby_tool import search_nearby_places
from app.utils.async_utils import run_sync
from app.utils.query_parser import detect_amenities
from app.utils.location_resolver import resolve_location, extract_location_from_text

logger = logging.getLogger(__name__)

DISCOVERY_TOOLS = [geocode_destination, search_nearby_places]


def _get_search_location(state: TripState) -> str:
    # Always prioritize the trip destination for nearby searches
    # This ensures we search in the correct city (e.g., Delhi) not random locations
    trip = state.get("trip", {})
    trip_destination = trip.get("destination", "Unknown")
    
    # Normalize trip destination for comparison
    trip_normalized = trip_destination.lower().replace(" ", "").replace(",", "")
    
    # Only use a different location if user explicitly mentions a different city in the query
    # e.g., "find cafes in Mumbai" when trip is in Delhi
    query_location = extract_location_from_text(state["user_query"])
    
    if query_location:
        query_normalized = query_location.lower().replace(" ", "").replace(",", "")
        # Check if the query location is actually different from the trip destination
        # Handle cases like "Delhi" vs "New Delhi, India"
        if query_normalized not in trip_normalized and trip_normalized not in query_normalized:
            # User explicitly asked for a different location
            logger.info(f"[DiscoveryAgent] User requested different location: {query_location} vs trip: {trip_destination}")
            return query_location
    
    # Default to trip destination
    logger.info(f"[DiscoveryAgent] Using trip destination: {trip_destination}")
    return trip_destination


def _fetch_places_deterministic(location: str, user_query: str) -> list:
    coords = run_sync(places_service.geocode(location))
    if not coords:
        logger.warning(f"[DiscoveryAgent] Could not geocode: {location}")
        return []

    amenities = detect_amenities(user_query)
    all_places = []
    seen = set()

    for amenity in amenities:
        places = run_sync(
            places_service.search_nearby(coords["lat"], coords["lon"], amenity)
        )
        for place in places:
            key = (place.get("name"), round(place.get("lat", 0), 4), round(place.get("lon", 0), 4))
            if key in seen:
                continue
            seen.add(key)
            place["city"] = location
            all_places.append(place)
        if len(amenities) > 1:
            time.sleep(1)

    logger.info(f"[DiscoveryAgent] Found {len(all_places)} places near {location}")
    return all_places


def discovery_agent_node(state: TripState) -> dict:
    logger.info("[DiscoveryAgent] Starting execution")
    location = _get_search_location(state)
    user_query = state["user_query"]
    logger.info(f"[DiscoveryAgent] User query: '{user_query}'")
    logger.info(f"[DiscoveryAgent] Searching near: {location}")
    logger.info(f"[DiscoveryAgent] Trip destination: {state.get('trip', {}).get('destination', 'N/A')}")

    places = _fetch_places_deterministic(location, user_query)
    recommendations = []

    if not places:
        llm = llm_service.get_llm()
        if llm:
            try:
                llm_with_tools = llm.bind_tools(DISCOVERY_TOOLS)
                budget_info = ""
                if state.get("remaining_budget") is not None:
                    budget_info = f"Remaining Budget: {state['remaining_budget']} {state.get('trip', {}).get('currency', 'USD')}"
                
                weather_info = state.get("weather", {}).get("current", {})
                
                messages = [
                    SystemMessage(content=DISCOVERY_SYSTEM_PROMPT.format(
                        destination=location,
                        user_query=user_query,
                        user_preferences=state.get("user_preferences", {}),
                        budget_info=budget_info,
                        weather_info=weather_info
                    )),
                    HumanMessage(content=(
                        f"Geocode the destination and search for the requested nearby places, ranking them based on the context."
                    )),
                ]

                # Tool-calling loop
                for _ in range(3):  # max iterations
                    response = llm_with_tools.invoke(messages)
                    messages.append(response)

                    if not response.tool_calls:
                        break

                    for tc in response.tool_calls:
                        tool_map = {t.name: t for t in DISCOVERY_TOOLS}
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
                parsed = _parse_discovery_output(output)
                recommendations = parsed.get("recommendations", [])
                places = parsed.get("nearby_places", [])
            except Exception as e:
                logger.warning(f"[DiscoveryAgent] LLM fallback failed: {e}")

    if not places:
        detected = detect_amenities(user_query)
        logger.warning(f"[DiscoveryAgent] No places found. Detected amenities: {detected}")
        recommendations.append(
            f"No {', '.join(detected) if detected else 'places'} found near {location}. "
            "Try a more specific city name (e.g. 'Los Angeles' instead of 'LA')."
        )
    else:
        logger.info(f"[DiscoveryAgent] Found {len(places)} places")
        recommendations.append(f"All results are near {location}.")

    return {
        "nearby_places": places,
        "active_location": location,
        "recommendations": state.get("recommendations", []) + recommendations,
        "current_agent_index": state.get("current_agent_index", 0) + 1,
    }


def _parse_discovery_output(output: str) -> dict:
    try:
        start = output.find("{")
        end = output.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(output[start:end])
    except Exception:
        pass
    return {"nearby_places": [], "recommendations": [output] if output else []}

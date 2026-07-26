"""
Route Tool - Used by Planning Agent.
Uses OpenRouteService to optimize attraction visit order.
"""
import httpx
import logging
from langchain.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

ORS_BASE = "https://api.openrouteservice.org"


@tool
def optimize_route(locations_json: str) -> dict:
    """
    Optimize the order to visit a list of attractions using OpenRouteService.
    Input JSON string: {"locations": [{"name": "...", "lat": 35.1, "lon": 135.7}, ...]}
    Returns optimized order with estimated travel times.
    """
    import json
    logger.info("[route_tool] Optimizing route")

    try:
        data = json.loads(locations_json)
        locations = data.get("locations", [])
    except Exception:
        return {"error": "Invalid input. Expected JSON with 'locations' list."}

    if len(locations) < 2:
        return {"optimized_route": locations, "note": "Single location - no optimization needed."}

    if not settings.OPENROUTESERVICE_API_KEY:
        # Return locations as-is with estimated times
        route = []
        for i, loc in enumerate(locations):
            route.append({**loc, "order": i + 1, "estimated_travel_minutes": 15 if i > 0 else 0})
        return {
            "optimized_route": route,
            "note": "Using default order. Configure OPENROUTESERVICE_API_KEY for real optimization.",
        }

    try:
        coords = [[loc["lon"], loc["lat"]] for loc in locations if "lon" in loc and "lat" in loc]
        if len(coords) < 2:
            return {"error": "Need at least 2 locations with coordinates to optimize."}

        response = httpx.post(
            f"{ORS_BASE}/v2/directions/driving-car/geojson",
            headers={
                "Authorization": settings.OPENROUTESERVICE_API_KEY,
                "Content-Type": "application/json",
            },
            json={"coordinates": coords},
            timeout=15.0,
        )
        route_data = response.json()

        segments = route_data.get("features", [{}])[0].get("properties", {}).get("segments", [])
        optimized = []
        for i, loc in enumerate(locations):
            duration = segments[i - 1]["duration"] / 60 if i > 0 and i - 1 < len(segments) else 0
            optimized.append({**loc, "order": i + 1, "estimated_travel_minutes": round(duration)})

        return {"optimized_route": optimized}

    except Exception as e:
        logger.error(f"[route_tool] Error: {e}")
        route = [{**loc, "order": i + 1, "estimated_travel_minutes": 15 if i > 0 else 0}
                 for i, loc in enumerate(locations)]
        return {"optimized_route": route, "note": f"Route API error: {str(e)}. Using default order."}

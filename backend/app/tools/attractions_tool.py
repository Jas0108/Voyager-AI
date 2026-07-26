"""
Attractions Tool - Used by Planning Agent.
Fetches tourist attractions from OpenTripMap API.
"""
import httpx
import logging
from langchain.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

OPENTRIPMAP_BASE = "https://api.opentripmap.com/0.1/en"


@tool
def get_attractions(destination: str) -> dict:
    """
    Find top tourist attractions for a destination.
    Returns names, coordinates, descriptions, and categories.
    Input: destination name (e.g., 'Kyoto', 'Paris')
    """
    logger.info(f"[attractions_tool] Searching attractions for: {destination}")

    if not settings.OPENTRIPMAP_API_KEY:
        return {
            "destination": destination,
            "attractions": _get_mock_attractions(destination),
            "note": "Using sample data. Configure OPENTRIPMAP_API_KEY for real data.",
        }

    try:
        # Step 1: Geocode the destination
        geo_resp = httpx.get(
            f"{OPENTRIPMAP_BASE}/places/geoname",
            params={"name": destination, "apikey": settings.OPENTRIPMAP_API_KEY},
            timeout=10.0,
        )
        geo_data = geo_resp.json()
        lat = geo_data.get("lat")
        lon = geo_data.get("lon")

        if not lat or not lon:
            return {"error": f"Could not geocode destination: {destination}"}

        # Step 2: Get nearby attractions
        places_resp = httpx.get(
            f"{OPENTRIPMAP_BASE}/places/radius",
            params={
                "radius": 5000,
                "lon": lon,
                "lat": lat,
                "kinds": "interesting_places,architecture,cultural",
                "rate": "3",
                "limit": 15,
                "apikey": settings.OPENTRIPMAP_API_KEY,
            },
            timeout=10.0,
        )
        places = places_resp.json()
        attractions = []
        for place in places.get("features", []):
            props = place.get("properties", {})
            coords = place.get("geometry", {}).get("coordinates", [None, None])
            attractions.append({
                "name": props.get("name", "Unknown"),
                "kinds": props.get("kinds", ""),
                "rating": props.get("rate", 0),
                "lat": coords[1],
                "lon": coords[0],
                "xid": props.get("xid"),
            })
        return {"destination": destination, "lat": lat, "lon": lon, "attractions": attractions}

    except Exception as e:
        logger.error(f"[attractions_tool] Error: {e}")
        return {
            "destination": destination,
            "attractions": _get_mock_attractions(destination),
            "note": f"API error: {str(e)}. Using sample data.",
        }


def _get_mock_attractions(destination: str) -> list:
    return [
        {"name": f"{destination} Historic District", "kinds": "architecture,cultural", "rating": 3},
        {"name": f"{destination} Central Park", "kinds": "parks,nature", "rating": 3},
        {"name": f"{destination} Art Museum", "kinds": "museums,art", "rating": 3},
        {"name": f"{destination} Market Square", "kinds": "markets,shopping", "rating": 2},
        {"name": f"{destination} Temple / Shrine", "kinds": "religion,architecture", "rating": 3},
    ]

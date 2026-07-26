"""
Nearby Tool - Used by Discovery Agent.
Searches Overpass API for nearby amenities around given coordinates.
"""
import logging
from langchain.tools import tool
from app.services.places_service import places_service
from app.utils.async_utils import run_sync

logger = logging.getLogger(__name__)

SUPPORTED_AMENITIES = [
    "restaurant", "cafe", "museum", "hospital",
    "pharmacy", "bank", "atm", "park", "supermarket"
]


@tool
def search_nearby_places(lat: float, lon: float, amenity: str = "restaurant", radius: int = 1000) -> dict:
    """
    Search for nearby places around a location using Overpass API.
    Amenity options: restaurant, cafe, museum, hospital, pharmacy, bank, atm, park, supermarket
    Returns a list of nearby places with names, coordinates, and details.
    """
    logger.info(f"[nearby_tool] Searching nearby {amenity} at {lat}, {lon}")

    if lat is None or lon is None:
        return {"error": "lat and lon are required."}

    if amenity not in SUPPORTED_AMENITIES:
        return {"error": f"Unsupported amenity. Choose from: {SUPPORTED_AMENITIES}"}

    try:
        places = run_sync(places_service.search_nearby(lat, lon, amenity, radius))
        return {
            "amenity": amenity,
            "lat": lat,
            "lon": lon,
            "radius": radius,
            "count": len(places),
            "places": places,
        }
    except Exception as e:
        logger.error(f"[nearby_tool] Error: {e}")
        return {"error": str(e), "amenity": amenity}

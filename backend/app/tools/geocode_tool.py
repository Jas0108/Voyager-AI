"""
Geocode Tool - Used by Discovery Agent.
Converts destination name to lat/lon using Nominatim (OpenStreetMap).
"""
import logging
from langchain.tools import tool
from app.services.places_service import places_service
from app.utils.async_utils import run_sync

logger = logging.getLogger(__name__)


@tool
def geocode_destination(destination: str) -> dict:
    """
    Convert a city or destination name to GPS coordinates (latitude and longitude).
    Input: destination name (e.g., 'Tokyo', 'Paris', 'New York')
    Returns: {"lat": float, "lon": float} or {"error": str}
    """
    logger.info(f"[geocode_tool] Geocoding: {destination}")
    try:
        result = run_sync(places_service.geocode(destination))
        if result:
            return result
        return {"error": f"Could not find coordinates for: {destination}"}
    except Exception as e:
        logger.error(f"[geocode_tool] Error: {e}")
        return {"error": str(e)}

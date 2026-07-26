"""
Attractions Tool - Used by Planning Agent.
Fetches tourist attractions from OpenTripMap API or rich curated fallbacks.
"""
import httpx
import logging
from langchain.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

OPENTRIPMAP_BASE = "https://api.opentripmap.com/0.1/en"

# Rich curated destination fallbacks when API returns sparse data
DESTINATION_ATTRACTIONS_MAP = {
    "bali": [
        "Sacred Monkey Forest Sanctuary", "Tegallalang Rice Terraces", "Uluwatu Temple & Cliff",
        "Tanah Lot Sea Temple", "Mount Batur", "Sekumpul Waterfalls", "Nusa Penida Kelingking Beach",
        "Ulun Danu Beratan Temple", "Jimbaran Bay Beach", "Seminyak Beach Club", "Canggu Echo Beach",
        "Padang Padang Beach", "Waterbom Bali", "Ubud Art Market", "Toya De Vasya Hot Springs"
    ],
    "tokyo": [
        "Senso-ji Temple", "Tokyo Skytree", "Meiji Shrine", "Shibuya Crossing", "Tsukiji Outer Market",
        "teamLab Planets", "Akihabara Electric Town", "Imperial Palace East Gardens", "Ueno Park",
        "Tokyo Tower", "Roppongi Hills Deck", "Ghibli Museum", "Odaiba Seaside Park", "Ginza Shopping District"
    ],
    "paris": [
        "Eiffel Tower", "Louvre Museum", "Musée d'Orsay", "Notre-Dame Cathedral", "Sainte-Chapelle",
        "Arc de Triomphe", "Sacré-Cœur Basilica", "Palace of Versailles", "Tuileries Garden",
        "Luxembourg Gardens", "Champs-Élysées", "Le Marais Quarter", "Montmartre Hill"
    ],
}


@tool
def get_attractions(destination: str) -> dict:
    """
    Find top tourist attractions for a destination.
    Returns names, coordinates, descriptions, and categories.
    Input: destination name (e.g., 'Bali', 'Tokyo', 'Paris')
    """
    logger.info(f"[attractions_tool] Searching attractions for: {destination}")

    dest_key = destination.lower()
    curated_fallback = None
    for key, items in DESTINATION_ATTRACTIONS_MAP.items():
        if key in dest_key:
            curated_fallback = [{"name": item, "kinds": "cultural,tourist", "rating": 3} for item in items]
            break

    if not settings.OPENTRIPMAP_API_KEY:
        return {
            "destination": destination,
            "attractions": curated_fallback or _get_mock_attractions(destination),
            "note": "Using curated destination data.",
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
            return {
                "destination": destination,
                "attractions": curated_fallback or _get_mock_attractions(destination)
            }

        # Step 2: Get nearby attractions (expanded radius, rate=1 to get all real places)
        places_resp = httpx.get(
            f"{OPENTRIPMAP_BASE}/places/radius",
            params={
                "radius": 25000,
                "lon": lon,
                "lat": lat,
                "kinds": "interesting_places,architecture,cultural,historic,natural",
                "rate": "1",
                "limit": 40,
                "apikey": settings.OPENTRIPMAP_API_KEY,
            },
            timeout=10.0,
        )
        places = places_resp.json()
        attractions = []
        for place in places.get("features", []):
            props = place.get("properties", {})
            name = props.get("name", "").strip()
            # Only include valid, named places
            if name and name.lower() not in ("unknown", "none", "null") and len(name) > 2:
                coords = place.get("geometry", {}).get("coordinates", [None, None])
                attractions.append({
                    "name": name,
                    "kinds": props.get("kinds", ""),
                    "rating": props.get("rate", 1),
                    "lat": coords[1],
                    "lon": coords[0],
                    "xid": props.get("xid"),
                })

        # If API returned fewer than 5 valid places, supplement with curated list
        if len(attractions) < 5 and curated_fallback:
            existing_names = {a["name"].lower() for a in attractions}
            for c in curated_fallback:
                if c["name"].lower() not in existing_names:
                    attractions.append(c)

        if not attractions:
            attractions = curated_fallback or _get_mock_attractions(destination)

        return {"destination": destination, "lat": lat, "lon": lon, "attractions": attractions}

    except Exception as e:
        logger.error(f"[attractions_tool] Error: {e}")
        return {
            "destination": destination,
            "attractions": curated_fallback or _get_mock_attractions(destination),
            "note": f"API error: {str(e)}.",
        }


def _get_mock_attractions(destination: str) -> list:
    dest = destination.title()
    return [
        {"name": f"{dest} Historic Old Town", "kinds": "architecture,cultural", "rating": 3},
        {"name": f"{dest} Botanical & Nature Gardens", "kinds": "parks,nature", "rating": 3},
        {"name": "National Fine Art Museum", "kinds": "museums,art", "rating": 3},
        {"name": "Central Craft Market & Bazaar", "kinds": "markets,shopping", "rating": 2},
        {"name": "Grand Cathedral & Heritage Site", "kinds": "religion,architecture", "rating": 3},
        {"name": "Panoramic City Viewpoint", "kinds": "sightseeing", "rating": 3},
        {"name": "Riverfront Boardwalk & Park", "kinds": "nature,walks", "rating": 3},
        {"name": "Cultural Performing Arts Center", "kinds": "culture", "rating": 3},
    ]

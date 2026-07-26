"""
Places Service - Encapsulates OpenStreetMap / Overpass HTTP calls.
"""
import time
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://z.overpass-api.de/api/interpreter",
]


class PlacesService:
    async def geocode(self, destination: str) -> Optional[dict]:
        """Convert a destination name to lat/lon."""
        if not destination or destination.strip().lower() == "unknown":
            logger.warning(f"Geocoding skipped for invalid destination: {destination}")
            return None
        try:
            logger.info(f"Geocoding destination: {destination}")
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    NOMINATIM_URL,
                    params={
                        "q": destination,
                        "format": "json",
                        "limit": 1,
                    },
                    headers={"User-Agent": "VoyagerAI/1.0 (travel-assistant)"},
                )
                data = response.json()
                if data:
                    result = {
                        "lat": float(data[0]["lat"]),
                        "lon": float(data[0]["lon"]),
                        "display_name": data[0].get("display_name", destination),
                    }
                    logger.info(f"Geocoded '{destination}' to {result['lat']}, {result['lon']} ({result['display_name']})")
                    return result
                else:
                    logger.warning(f"Geocoding returned no results for: {destination}")
        except Exception as e:
            logger.error(f"Geocoding failed for {destination}: {e}")
        return None

    def _element_coords(self, element: dict) -> tuple[Optional[float], Optional[float]]:
        if "lat" in element and "lon" in element:
            return float(element["lat"]), float(element["lon"])
        center = element.get("center")
        if center:
            return center.get("lat"), center.get("lon")
        return None, None

    async def search_nearby(self, lat: float, lon: float, amenity: str, radius: int = 1500) -> list:
        """Search Overpass API for nearby places."""
        logger.info(f"Searching for '{amenity}' near coordinates {lat}, {lon} (radius: {radius}m)")
        
        # Tourist attractions use the 'tourism' tag in OSM, not 'amenity'
        if amenity == "tourism":
            query = f"""
            [out:json][timeout:25];
            (
              node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:{radius},{lat},{lon});
              way["tourism"~"attraction|museum|viewpoint|artwork|gallery"](around:{radius},{lat},{lon});
              node["historic"](around:{radius},{lat},{lon});
              way["historic"](around:{radius},{lat},{lon});
            );
            out center 25;
            """
        else:
            query = f"""
            [out:json][timeout:25];
            (
              node["amenity"="{amenity}"](around:{radius},{lat},{lon});
              way["amenity"="{amenity}"](around:{radius},{lat},{lon});
            );
            out center 25;
            """
        for url in OVERPASS_URLS:
            try:
                logger.info(f"Trying Overpass API: {url}")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        url,
                        data={"data": query},
                        headers={"User-Agent": "VoyagerAI/1.0 (travel-assistant)"},
                    )
                    if response.status_code != 200:
                        logger.warning(f"Overpass {url} returned {response.status_code}")
                        continue

                    data = response.json()
                    elements = data.get("elements", [])
                    logger.info(f"Overpass returned {len(elements)} elements for amenity='{amenity}'")
                    
                    places = []
                    for element in elements:
                        elat, elon = self._element_coords(element)
                        if elat is None or elon is None:
                            continue
                        tags = element.get("tags", {})
                        name = tags.get("name") or tags.get("brand") or f"Unnamed {amenity}"
                        address = self._format_address(tags)
                        google_maps_url = (
                            f"https://www.google.com/maps/search/?api=1&query={f'{name}, {address}'.replace(' ', '+')}"
                            if address else f"https://maps.google.com/?q={elat},{elon}"
                        )
                        place_data = {
                            "name": name,
                            "amenity": amenity,
                            "type": amenity,
                            "lat": elat,
                            "lon": elon,
                            "address": address,
                            "website": tags.get("website"),
                            "phone": tags.get("phone"),
                            "opening_hours": tags.get("opening_hours"),
                            "google_maps_url": google_maps_url,
                        }
                        places.append(place_data)
                        logger.info(f"Found place: {name} at {elat}, {elon} - {address}")
                    
                    if places:
                        logger.info(f"Returning {len(places)} {amenity} places")
                        return places
                    else:
                        logger.warning(f"No valid places found for amenity='{amenity}'")
            except Exception as e:
                logger.warning(f"Overpass search failed on {url} for amenity={amenity}: {e}")

        logger.warning(f"All Overpass APIs failed for amenity='{amenity}'")
        return []

    def _format_address(self, tags: dict) -> str:
        parts = [
            tags.get("addr:housenumber"),
            tags.get("addr:street"),
            tags.get("addr:city"),
            tags.get("addr:postcode"),
            tags.get("addr:country"),
        ]
        return ", ".join(p for p in parts if p) or ""


places_service = PlacesService()

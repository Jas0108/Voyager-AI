"""Resolve which city/location to use for discovery, weather, and geocoding."""
import re
from typing import List, Optional, Tuple

# Short names → geocoder-friendly strings
CITY_ALIASES = {
    "la": "Los Angeles, California, USA",
    "l.a.": "Los Angeles, California, USA",
    "los angeles": "Los Angeles, California, USA",
    "nyc": "New York City, New York, USA",
    "ny": "New York City, New York, USA",
    "new york": "New York City, New York, USA",
    "sf": "San Francisco, California, USA",
    "san francisco": "San Francisco, California, USA",
    "dc": "Washington, DC, USA",
    "miami": "Miami, Florida, USA",
    "chicago": "Chicago, Illinois, USA",
    "boston": "Boston, Massachusetts, USA",
    "seattle": "Seattle, Washington, USA",
    "london": "London, UK",
    "paris": "Paris, France",
    "tokyo": "Tokyo, Japan",
    "kyoto": "Kyoto, Japan",
    "delhi": "New Delhi, India",
    "mumbai": "Mumbai, India",
    "bangalore": "Bengaluru, India",
    "bengaluru": "Bengaluru, India",
}

VAGUE_DESTINATIONS = {
    "", "unknown", "usa", "us", "u.s.", "u.s.a.", "united states",
    "america", "the states", "world", "europe", "asia",
}

COMMAND_WORDS = {
    "find", "update", "budget", "plan", "how", "what", "help", "thanks",
    "thank", "show", "tell", "recommend", "suggest", "also", "well",
}

LOCATION_PATTERNS = [
    re.compile(r"landed\s+in\s+([^,.!?]+)", re.I),
    re.compile(r"(?:i'?m\s+in|i\s+am\s+in|arrived\s+in|currently\s+in)\s+([^,.!?]+)", re.I),
    re.compile(r"(?:weather|wether|temperature|forecast)\s+(?:in|at|for)\s+(.+?)(?:[?.!,]|$)", re.I),
    re.compile(r"(?:cafe|café|coffee|restaurant|restaurants|food|lunch|dinner)\s+(?:in|at|near)\s+(.+?)(?:[?.!,]|$)", re.I),
    re.compile(r"find\s+(?:me\s+)?(?:\w+\s+){0,6}(?:in|at|near)\s+(.+?)(?:[?.!,]|$)", re.I),
    re.compile(r"(?:in|at|near|around)\s+([A-Za-z][A-Za-z\s.'-]{0,40}?)(?:\s+(?:for|to|and|with)|[?.!,]|$)", re.I),
]

LANDED_PATTERNS = [
    re.compile(r"landed\s+in\s+([^,.!?]+)", re.I),
    re.compile(r"(?:i'?m\s+in|i\s+am\s+in|arrived\s+in)\s+([^,.!?]+)", re.I),
]


def is_broad_trip(trip_destination: str) -> bool:
    """True when the trip spans multiple places (e.g. USA, Europe)."""
    return is_vague_destination(trip_destination)


def normalize_location(raw: str) -> str:
    cleaned = raw.strip().rstrip(".,!?")
    key = cleaned.lower()
    return CITY_ALIASES.get(key, cleaned)


def is_vague_destination(dest: Optional[str]) -> bool:
    if not dest:
        return True
    return dest.strip().lower() in VAGUE_DESTINATIONS


def _clean_extracted(loc: str) -> Optional[str]:
    loc = loc.strip().rstrip(".,!?")
    # Trim trailing filler words
    loc = re.sub(r"\s+(as well|too|please|now)$", "", loc, flags=re.I).strip()
    if not loc or is_vague_destination(loc):
        return None
    if len(loc) < 2:
        return None
    return normalize_location(loc)


def extract_location_from_text(text: str) -> Optional[str]:
    for pattern in LOCATION_PATTERNS:
        match = pattern.search(text)
        if match:
            loc = _clean_extracted(match.group(1))
            if loc:
                return loc

    # Entire message may be a city name (e.g. "LA", "Paris")
    stripped = text.strip().rstrip(".,!?")
    words = stripped.split()
    if 1 <= len(words) <= 3:
        lower_words = set(w.lower() for w in words)
        if not lower_words & COMMAND_WORDS:
            candidate = normalize_location(stripped)
            key = stripped.lower()
            if key in CITY_ALIASES or (len(stripped) <= 25 and not is_vague_destination(candidate)):
                return candidate
    return None


def extract_location_from_history(history: List[dict]) -> Optional[str]:
    """Extract location from conversation history — only from USER messages.

    Assistant messages often mention place names (restaurants, hotels, etc.)
    that are NOT the user's current city. Only user messages reliably indicate
    where the user is (e.g. 'I just landed in Mumbai').
    """
    for msg in reversed(history[-10:]):
        if msg.get("role", "").lower() != "user":
            continue
        loc = extract_location_from_text(msg.get("content", ""))
        if loc:
            return loc
    return None


def detect_destination_update(query: str, trip_destination: str) -> Optional[str]:
    """
    Only update the stored trip destination when the user explicitly renames the trip.
    Saying 'I'm in LA' on a USA multi-state trip updates current location in chat only,
    NOT the trip name/destination in the database.
    """
    explicit_patterns = [
        re.compile(r"change\s+(?:my\s+)?trip\s+(?:destination\s+)?to\s+([^,.!?]+)", re.I),
        re.compile(r"rename\s+(?:my\s+)?trip\s+to\s+([^,.!?]+)", re.I),
        re.compile(r"set\s+(?:my\s+)?trip\s+destination\s+to\s+([^,.!?]+)", re.I),
    ]
    for pattern in explicit_patterns:
        match = pattern.search(query)
        if match:
            loc = _clean_extracted(match.group(1))
            if loc:
                return loc
    return None


def resolve_location(
    query: str,
    trip_destination: str,
    conversation_history: Optional[List[dict]] = None,
) -> Tuple[str, Optional[str]]:
    """
    Pick where the user is RIGHT NOW for weather/places queries.

  Trip destination (e.g. 'USA') may be broad for multi-city trips.
    Current city comes from the chat message or recent conversation history.
    """
    history = conversation_history or []
    destination_update = detect_destination_update(query, trip_destination)

    loc = extract_location_from_text(query)
    if loc:
        return loc, destination_update

    loc = extract_location_from_history(history)
    if loc:
        return loc, destination_update

    if not is_vague_destination(trip_destination):
        return trip_destination, destination_update

    return trip_destination or "Unknown", destination_update


def recent_context_text(history: List[dict], limit: int = 6) -> str:
    return " ".join(m.get("content", "") for m in history[-limit:])

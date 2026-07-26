"""Lightweight intent parsing for agent routing and tool selection."""
import re
from typing import List, Optional

from app.utils.location_resolver import recent_context_text

AMENITY_KEYWORDS = {
    "restaurant": [
        "restaurant", "restaurants", "restarunts", "restuarants", "restarents",
        "resturaunt", "restarant", "resturant", "restraunt", "restrant", "resteraunt",
        "dining", "food", "eat", "lunch", "dinner", "sushi", "pizza", "bistro", "eatery"
    ],
    "cafe": ["cafe", "café", "coffee", "cafes", "bakery", "coffeeshop"],
    "museum": ["museum", "museums", "gallery", "galleries"],
    "hospital": ["hospital", "medical", "clinic", "doctor"],
    "pharmacy": ["pharmacy", "drugstore", "medicine"],
    "bank": ["bank", "banks"],
    "atm": ["atm", "cash machine"],
    "park": ["park", "parks", "garden"],
    "supermarket": ["supermarket", "grocery", "groceries", "market"],
    "tourism": ["tourist", "attraction", "attractions", "sightseeing", "sight", "sights",
                "monument", "monuments", "landmark", "landmarks", "temple", "temples",
                "church", "churches", "mosque", "fort", "palace"],
}

# Phrases that indicate the user wants sightseeing / attractions (route to planning)
SIGHTSEEING_KEYWORDS = [
    "places to see", "places to visit", "things to do", "things to see",
    "places i can see", "places i can visit", "places i can go",
    "what to see", "what to visit", "what to do",
    "places can i go", "places can i see", "places can i visit",
    "sightseeing", "must see", "must visit", "top attractions",
    "tourist spots", "famous places", "best places",
    "attractions", "tourist attractions", "landmarks", "monuments",
    "where should i go", "recommend places",
]

WEATHER_KEYWORDS = [
    "weather", "wether", "temperature", "forecast", "rain", "raining",
    "sunny", "cloudy", "cold", "hot", "humid", "snow", "climate",
]

ITINERARY_KEYWORDS = ["plan", "replan", "replanning", "itinerary", "schedule", "day-by-day", "activities", "trip plan", "organize my trip"]

ITINERARY_MODIFICATION_KEYWORDS = [
    "change", "modify", "update", "replace", "swap", "switch",
    "i want to go", "i'd like to", "can we", "instead",
    "rather", "different", "amusement park", "theme park",
]

# Patterns that indicate user wants to modify a specific day
DAY_REFERENCE_PATTERN = re.compile(
    r"(?:day\s*\d+|last\s+day|first\s+day|final\s+day|" 
    r"morning|afternoon|evening|\bday\b)",
    re.IGNORECASE,
)

BUDGET_KEYWORDS = [
    "budget", "spent", "spending", "expense", "expenses", "cost", "costs",
    "how much left", "remaining", "daily allowance", "money left",
    "afford", "enough", "finish", "complete", "paid", "add to expenses",
]

BUDGET_UPDATE_PATTERNS = [
    r"(?:update|set|change|adjust|increase|decrease|raise|lower|reduce)\s+(?:my\s+)?(?:trip\s+)?budget\s+(?:to|at)\s+\$?([\d,]+(?:\.\d+)?)",
    r"(?:budget)\s+(?:to|at)\s+\$?([\d,]+(?:\.\d+)?)",
    r"\$?([\d,]+(?:\.\d+)?)\s+(?:as\s+)?(?:my\s+)?(?:new\s+)?budget",
    r"(?:make\s+(?:my\s+)?budget\s+)(?:\$?)([\d,]+(?:\.\d+)?)",
    r"(?:change\s+(?:my\s+)?budget\s+to\s+)(?:\$?)([\d,]+(?:\.\d+)?)",
]

# Patterns for detecting expense creation (e.g., "spent 100 on food", "I spent ₹200000 on hotels")
EXPENSE_PATTERNS = [
    # "spent 150 dollars on dinner" / "paid ₹500 for taxi"
    r"(?:spent|paid|cost|used)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)\s*(?:dollars|euros|usd|eur|gbp|inr|rupees|bucks)?\s+(?:on|for)\s+(.+)",
    # "add 200000 hotel expense" / "add 5000 to expenses for food"
    r"(?:add|record|log)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)\s*(?:dollars|euros|usd|eur|gbp|inr|rupees|bucks)?\s+(?:to\s+(?:my\s+)?expenses?\s+(?:for|on)\s+|(?:for|on)\s+|)(\S+.*?)(?:\s+(?:to|in)\s+(?:my\s+)?expenses?)?$",
    # "hotels cost 200000" / "food was 5000"
    r"(\S+.*?)\s+(?:cost|was|were|came to)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)",
]


def _contains_keyword(text: str, keywords: List[str]) -> bool:
    """Helper to check if any keyword matches as a whole word in text."""
    for kw in keywords:
        pattern = r'\b' + re.escape(kw) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def detect_amenities(query: str) -> List[str]:
    query_lower = query.lower()
    return [amenity for amenity, keywords in AMENITY_KEYWORDS.items() if _contains_keyword(query_lower, keywords)]


def is_sightseeing_query(query: str) -> bool:
    """Check if the user is asking about places to see/visit (attractions)."""
    return any(k in query.lower() for k in SIGHTSEEING_KEYWORDS)


def is_weather_query(query: str, conversation_history: Optional[List[dict]] = None) -> bool:
    text = query.lower()
    if _contains_keyword(text, WEATHER_KEYWORDS):
        return True
    if conversation_history:
        context = recent_context_text(conversation_history, 4).lower()
        if _contains_keyword(context, WEATHER_KEYWORDS) and len(query.split()) <= 3:
            return True
    return False


def is_itinerary_query(query: str) -> bool:
    return _contains_keyword(query.lower(), ITINERARY_KEYWORDS) or is_itinerary_modification_query(query)


def is_itinerary_modification_query(query: str) -> bool:
    """Check if the user wants to modify a specific part of an existing itinerary."""
    text = query.lower()
    has_day_ref = bool(DAY_REFERENCE_PATTERN.search(text))
    has_modification_word = _contains_keyword(text, ITINERARY_MODIFICATION_KEYWORDS)
    return bool(
        (has_day_ref and has_modification_word) or
        re.search(r"(?:change|modify|update|replace)\s+(?:my\s+)?day\s*\d+", text) or
        re.search(r"day\s*\d+.*(?:change|modify|update|replace|instead|swap)", text)
    )


def is_discovery_query(query: str, conversation_history: Optional[List[dict]] = None) -> bool:
    text = query.lower()
    discovery_words = [
        "near", "nearby", "near me", "find", "suggest", "recommend", "restaurant", "restaurants",
        "restarunts", "restuarants", "resturant", "restraunt", "cafe", "café", "coffee",
        "museum", "hospital", "atm", "lunch", "dinner", "food", "eat", "eateries",
        "pharmacy", "bank", "supermarket", "park",
    ]
    if _contains_keyword(text, discovery_words):
        return True
    if conversation_history:
        context = recent_context_text(conversation_history, 4).lower()
        if _contains_keyword(context, discovery_words):
            follow_up = ["as well", "also", "too", "more", "restaurants", "cafes"]
            if _contains_keyword(text, follow_up) or detect_amenities(query):
                return True
    return False


def is_budget_query(query: str) -> bool:
    """Check if the user is asking about budget/expenses."""
    text = query.lower()
    return _contains_keyword(text, BUDGET_KEYWORDS)


def parse_budget_update(query: str) -> Optional[float]:
    for pattern in BUDGET_UPDATE_PATTERNS:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def parse_expense(query: str) -> Optional[dict]:
    """Parse expense from query like 'spent 100 on food' or 'paid 50 for taxi'."""
    for i, pattern in enumerate(EXPENSE_PATTERNS):
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            try:
                if i == 2:
                    # Reversed pattern: category first, amount second
                    category = match.group(1).strip()
                    amount = float(match.group(2).replace(",", ""))
                else:
                    amount = float(match.group(1).replace(",", ""))
                    category = match.group(2).strip()
                # Clean up category — remove trailing noise like "to my expenses"
                category = re.sub(r'\s+to\s+(?:my\s+)?expenses?.*$', '', category, flags=re.IGNORECASE)
                # Normalize common categories
                category = _normalize_category(category)
                return {"amount": amount, "category": category}
            except (ValueError, IndexError):
                continue
    return None


def _normalize_category(raw: str) -> str:
    """Normalize free-form category text to a clean category name."""
    raw_lower = raw.lower().strip()
    # Map common phrases to clean category names
    category_map = {
        "hotel": "Hotels", "hotels": "Hotels", "accommodation": "Hotels",
        "stay": "Hotels", "room": "Hotels", "lodging": "Hotels",
        "food": "Food", "restaurant": "Food", "dining": "Food",
        "lunch": "Food", "dinner": "Food", "breakfast": "Food", "meal": "Food", "meals": "Food",
        "taxi": "Transport", "cab": "Transport", "uber": "Transport",
        "transport": "Transport", "transportation": "Transport", "bus": "Transport",
        "train": "Transport", "flight": "Transport", "flights": "Transport",
        "shopping": "Shopping", "souvenirs": "Shopping", "gifts": "Shopping",
        "tickets": "Activities", "entry": "Activities", "tour": "Activities",
        "activities": "Activities", "sightseeing": "Activities",
    }
    # Check if raw starts with a known keyword
    first_word = raw_lower.split()[0] if raw_lower else raw_lower
    if first_word in category_map:
        return category_map[first_word]
    # Return cleaned-up version with title case
    return raw.strip().title()

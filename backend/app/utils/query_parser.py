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

DAY_REFERENCE_PATTERN = re.compile(
    r"(?:day\s*\d+|last\s+day|first\s+day|final\s+day|" 
    r"morning|afternoon|evening|\bday\b)",
    re.IGNORECASE,
)

BUDGET_KEYWORDS = [
    "budget", "spent", "spending", "spend", "expense", "expenses", "cost", "costs",
    "how much left", "remaining", "daily allowance", "money left",
    "afford", "enough", "finish", "complete", "paid", "add to expenses", "log expense",
]

# Patterns specifically for updating the overall total trip budget (must explicitly mention budget to/at/set to X)
BUDGET_UPDATE_PATTERNS = [
    r"(?:update|set|change|adjust|increase|decrease|raise|lower|reduce)\s+(?:my\s+)?(?:trip\s+)?budget\s+(?:to|at|=)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)",
    r"(?:total\s+budget)\s+(?:to|at|=)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)",
    r"(?:make\s+(?:my\s+)?budget)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)",
]

# Robust expense patterns supporting "5000 on club", "spent 5000 inr on food", "spend 100", etc.
EXPENSE_PATTERNS = [
    # "5000 on club, update my budget" / "5000 inr on food"
    r"(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)\s*(?:dollars|euros|usd|eur|gbp|inr|rupees|rs|bucks)?\s+(?:on|for)\s+(.+)",
    # "spent 5000 inr on food" / "spend 5000 on hotels" / "paid 500 for taxi"
    r"(?:spent|spend|spending|paid|pay|cost|used|logged|add)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)\s*(?:dollars|euros|usd|eur|gbp|inr|rupees|rs|bucks)?\s+(?:on|for)\s+(.+)",
    # "spend 5000" / "spent 5000 inr" / "i just spend 5000"
    r"(?:spent|spend|spending|paid|pay|cost|used)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)\s*(?:dollars|euros|usd|eur|gbp|inr|rupees|rs|bucks)?",
    # "add 200000 hotel expense" / "log 5000 for food"
    r"(?:add|record|log)\s+(?:[₹$€£¥]?)\s*([\d,]+(?:\.\d+)?)\s*(?:dollars|euros|usd|eur|gbp|inr|rupees|rs|bucks)?\s+(?:to\s+(?:my\s+)?expenses?\s+(?:for|on)\s+|(?:for|on)\s+|)(\S+.*?)(?:\s+(?:to|in)\s+(?:my\s+)?expenses?)?$",
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
    text = query.lower()
    return _contains_keyword(text, BUDGET_KEYWORDS)


def parse_budget_update(query: str) -> Optional[float]:
    # If the query contains "on [category]", it is an expense, NOT a budget update
    if re.search(r"\b(?:on|for)\b\s+[a-zA-Z]", query, re.IGNORECASE):
        return None

    for pattern in BUDGET_UPDATE_PATTERNS:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def parse_expense(query: str) -> Optional[dict]:
    """Parse expense from query like '5000 on club, update my budget' or 'spent 100 on food'."""
    for i, pattern in enumerate(EXPENSE_PATTERNS):
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            try:
                if i == 2:
                    # Single amount without explicit category
                    amount = float(match.group(1).replace(",", ""))
                    category = "General"
                elif i == 4:
                    # Category first, amount second
                    category = match.group(1).strip()
                    amount = float(match.group(2).replace(",", ""))
                else:
                    amount = float(match.group(1).replace(",", ""))
                    category = match.group(2).strip() if len(match.groups()) > 1 and match.group(2) else "General"
                
                # Strip trailing instruction noise like ", update my budget", "update budget", etc.
                category = re.sub(r'[,.]?\s*(?:and\s+)?(?:please\s+)?(?:update|set|change|add|recalculate)\s+(?:my\s+)?(?:trip\s+)?(?:budget|expenses?).*$', '', category, flags=re.IGNORECASE)
                category = category.strip(" ,.")
                
                category = _normalize_category(category)
                return {"amount": amount, "category": category}
            except (ValueError, IndexError):
                continue
    return None


def _normalize_category(raw: str) -> str:
    """Normalize free-form category text to a clean category name."""
    if not raw or not raw.strip():
        return "General"
    raw_lower = raw.lower().strip()
    category_map = {
        "club": "Nightlife & Clubs", "clubs": "Nightlife & Clubs", "clubbing": "Nightlife & Clubs", "pub": "Nightlife & Clubs", "bar": "Nightlife & Clubs",
        "hotel": "Hotels", "hotels": "Hotels", "accommodation": "Hotels", "stay": "Hotels", "room": "Hotels",
        "food": "Food & Dining", "restaurant": "Food & Dining", "dining": "Food & Dining", "lunch": "Food & Dining", "dinner": "Food & Dining",
        "taxi": "Transport", "cab": "Transport", "uber": "Transport", "transport": "Transport",
        "shopping": "Shopping", "souvenirs": "Shopping",
        "tickets": "Activities", "tour": "Activities", "activities": "Activities",
    }
    first_word = raw_lower.split()[0] if raw_lower else raw_lower
    if first_word in category_map:
        return category_map[first_word]
    return raw.strip().title()

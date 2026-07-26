"""
Synthesizer Agent.
Reads the full TripState after specialist agents run and writes the final user-facing response.
"""
import json
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import TripState
from app.prompts.synthesizer_prompt import SYNTHESIZER_SYSTEM_PROMPT
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


def _build_context(state: TripState) -> str:
    """Build context with ONLY the data relevant to what the user asked."""
    trip = state.get("trip", {})
    execution_plan = state.get("execution_plan", [])

    active = state.get("active_location") or trip.get("destination")
    trip_dest = trip.get("destination")

    # Include recent conversation history for continuity
    history = state.get("conversation_history", [])
    recent_history = [
        {"role": m["role"], "content": m["content"]}
        for m in history[-6:]
    ] if history else []

    context = {
        # Put CURRENT destination front-and-center so the LLM never confuses it
        "CURRENT_DESTINATION": active,
        "user_query": state.get("user_query"),
        "active_location": active,
        "trip_destination": trip_dest,
        "conversation_history": recent_history,
    }

    # Only include data from agents that actually ran
    if "planning" in execution_plan:
        weather = state.get("weather")
        if weather:
            trimmed_weather = {"current": weather.get("current")}
            forecast = weather.get("forecast", {})
            if forecasts := forecast.get("forecast", []):
                trimmed_weather["forecast"] = forecasts[:4]
            context["weather"] = trimmed_weather

        itinerary = state.get("itinerary")
        if itinerary:
            context["itinerary"] = itinerary[:14]  # Pass full itinerary (cap at 14 days to avoid token overflow)

    if "discovery" in execution_plan:
        places = state.get("nearby_places") or []
        if places:
            context["nearby_places"] = [
                {
                    "name": p.get("name"),
                    "type": p.get("type", p.get("amenity")),
                    "address": p.get("address"),
                    "opening_hours": p.get("opening_hours"),
                }
                for p in places[:12]
            ]
            context["total_places_found"] = len(places)

    if "budget" in execution_plan:
        context["budget"] = trip.get("budget")
        context["currency"] = trip.get("currency", "USD")
        context["remaining_budget"] = state.get("remaining_budget")
        context["budget_updated"] = state.get("budget_update")
        # Include itinerary summary for budget+itinerary queries
        itinerary = state.get("itinerary")
        if itinerary:
            context["itinerary_destination"] = active
            context["itinerary_days"] = len(itinerary)

    # Only include recommendations if they exist
    recs = state.get("recommendations") or []
    if recs:
        context["recommendations"] = recs[:5]

    return json.dumps(context, indent=2, default=str)



def _fallback_response(state: TripState) -> str:
    """Generate a fallback response when LLM is unavailable."""
    parts = []
    query = state.get("user_query", "")
    execution_plan = state.get("execution_plan", [])

    if "planning" in execution_plan:
        if weather := state.get("weather"):
            current = weather.get("current", {})
            if current and not current.get("error"):
                parts.append(
                    f"Weather in {current.get('destination', 'your destination')}: "
                    f"{current.get('description', 'N/A')}, {current.get('temperature', 'N/A')}°C "
                    f"(feels like {current.get('feels_like', 'N/A')}°C)."
                )
            forecast = weather.get("forecast", {})
            if forecasts := forecast.get("forecast", []):
                upcoming = forecasts[:3]
                parts.append(
                    "Upcoming: "
                    + "; ".join(f"{f['datetime']}: {f['description']}, {f['temp']}°C" for f in upcoming)
                )

        if itinerary := state.get("itinerary"):
            parts.append(f"I've put together a {len(itinerary)}-day itinerary for you.")

    if "discovery" in execution_plan:
        if places := state.get("nearby_places"):
            loc = state.get("active_location") or state.get("trip", {}).get("destination", "your area")
            listing = "\n".join(
                f"- {p.get('name', 'Unknown')} ({p.get('type', p.get('amenity', 'place'))})"
                + (f" — {p.get('address')}" if p.get("address") else "")
                for p in places[:10]
            )
            parts.append(f"Here are some places near {loc}:\n{listing}")
        else:
            parts.append("I couldn't find any places matching your search. Try being more specific with the location.")

    if "budget" in execution_plan:
        if state.get("budget_update"):
            trip = state.get("trip", {})
            parts.append(
                f"Done! Your budget is now "
                f"{state['budget_update']:.2f} {trip.get('currency', 'USD')}."
            )

        if state.get("remaining_budget") is not None:
            trip = state.get("trip", {})
            parts.append(
                f"Remaining budget: {state['remaining_budget']:.2f} {trip.get('currency', 'USD')}."
            )

    if parts:
        return " ".join(parts)

    return (
        "I'm here to help! You can ask me to find restaurants or places nearby, "
        "check the weather, plan your itinerary, or manage your budget."
    )


def _generate_insights(state: TripState) -> dict:
    insights = {}
    trip = state.get("trip", {}) or {}
    expenses = state.get("expenses", []) or []
    weather_data = state.get("weather") or {}
    weather = weather_data.get("current", {}) or {}
    itinerary = state.get("itinerary", []) or []
    
    # 1. Budget Status
    if trip.get("budget"):
        total_budget = trip.get("budget")
        total_spent = sum(e.get("amount", 0) for e in expenses)
        remaining = state.get("remaining_budget", total_budget - total_spent)
        if total_spent > total_budget:
            insights["Budget Status"] = f"Over budget by {total_spent - total_budget} {trip.get('currency', 'USD')}!"
        elif total_budget > 0:
            spent_pct = (total_spent / total_budget) * 100
            if spent_pct > 90:
                insights["Budget Status"] = f"Critical: {spent_pct:.1f}% spent. Only {remaining} left."
            elif spent_pct > 75:
                insights["Budget Status"] = f"Warning: {spent_pct:.1f}% spent."
            else:
                insights["Budget Status"] = f"Healthy: {remaining} {trip.get('currency', 'USD')} remaining."

    # 2. Expense Breakdown
    if expenses:
        categories = {}
        for e in expenses:
            cat = e.get("category", "Other")
            categories[cat] = categories.get(cat, 0) + e.get("amount", 0)
        top_cat = max(categories.items(), key=lambda x: x[1])
        insights["Expense Breakdown"] = f"Highest spending on {top_cat[0]} ({top_cat[1]} {trip.get('currency', 'USD')})."

    # 3. Weather Alerts
    if weather and not weather.get("error"):
        desc = weather.get("description", "").lower()
        if "rain" in desc or "storm" in desc:
            insights["Weather Alerts"] = f"Rain expected ({desc}). Carry an umbrella and plan indoor activities."
        elif "snow" in desc:
            insights["Weather Alerts"] = "Snow expected. Dress warmly."
        elif weather.get("temperature", 0) > 30:
            insights["Weather Alerts"] = "High temperatures. Stay hydrated."
        else:
            insights["Weather Alerts"] = "Weather looks good for outdoor activities."

    # 4. Trip Progress
    if itinerary:
        insights["Trip Progress"] = f"Itinerary planned for {len(itinerary)} days."

    # 5. Recommendation Summary
    recs = state.get("recommendations", [])
    if recs:
        insights["Recommendation Summary"] = f"Generated {len(recs)} new recommendations."

    return insights


def synthesizer_node(state: TripState) -> dict:
    """Produce the final response from gathered agent context."""
    if state.get("final_response"):
        logger.info("[Synthesizer] Using supervisor direct response")
        return {}

    logger.info("[Synthesizer] Generating final response")
    
    # Generate insights from state
    insights = _generate_insights(state)
    
    context = _build_context(state)
    if insights:
        context = context[:-1] + f',\n  "insights": {json.dumps(insights)}\n}}'

    messages = [
        SystemMessage(content=SYNTHESIZER_SYSTEM_PROMPT),
        HumanMessage(content=f"Context:\n{context}"),
    ]

    response = llm_service.invoke(messages)
    if response and not response.startswith("LLM not available") and not response.startswith("Error:"):
        return {"final_response": response, "insights": insights}

    logger.warning("[Synthesizer] LLM unavailable, using fallback response")
    return {"final_response": _fallback_response(state), "insights": insights}

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

    history = state.get("conversation_history", [])
    recent_history = [
        {"role": m["role"], "content": m["content"]}
        for m in history[-6:]
    ] if history else []

    context = {
        "CURRENT_DESTINATION": active,
        "user_query": state.get("user_query"),
        "active_location": active,
        "trip_destination": trip_dest,
        "conversation_history": recent_history,
    }

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
            context["itinerary"] = itinerary[:14]

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
        context["new_expense"] = state.get("new_expense")
        itinerary = state.get("itinerary")
        if itinerary:
            context["itinerary_destination"] = active
            context["itinerary_days"] = len(itinerary)

    recs = state.get("recommendations") or []
    if recs:
        context["recommendations"] = recs[:5]

    return json.dumps(context, indent=2, default=str)


def _fallback_response(state: TripState) -> str:
    """Generate a warm, conversational fallback response."""
    parts = []
    execution_plan = state.get("execution_plan", [])
    trip = state.get("trip", {})
    currency = trip.get("currency", "USD")

    if "budget" in execution_plan:
        if new_exp := state.get("new_expense"):
            rem = state.get("remaining_budget", 0)
            parts.append(
                f"I've logged your expense of {new_exp['amount']:,.2f} {currency} for {new_exp['category']}! "
                f"Your updated remaining budget is {rem:,.2f} {currency}."
            )
        elif budget_upd := state.get("budget_update"):
            rem = state.get("remaining_budget", 0)
            parts.append(
                f"Got it! I've updated your total trip budget to {budget_upd:,.2f} {currency}. "
                f"Your new remaining balance is {rem:,.2f} {currency}."
            )
        elif rem := state.get("remaining_budget"):
            parts.append(f"Your current remaining budget is {rem:,.2f} {currency}.")

    if "planning" in execution_plan:
        if weather := state.get("weather"):
            current = weather.get("current", {})
            if current and not current.get("error"):
                parts.append(
                    f"Weather update for {current.get('destination', 'your destination')}: "
                    f"{current.get('description', 'N/A')}, {current.get('temperature', 'N/A')}°C."
                )

        if itinerary := state.get("itinerary"):
            parts.append(f"I've updated your {len(itinerary)}-day itinerary.")

    if "discovery" in execution_plan:
        if places := state.get("nearby_places"):
            loc = state.get("active_location") or state.get("trip", {}).get("destination", "your area")
            listing = "\n".join(
                f"• {p.get('name', 'Unknown')} ({p.get('type', p.get('amenity', 'place'))})"
                + (f" — {p.get('address')}" if p.get("address") else "")
                for p in places[:6]
            )
            parts.append(f"Here are some great spots near {loc}:\n{listing}")

    if parts:
        return " ".join(parts)

    return (
        "I'm Voyager AI, your travel assistant! Let me know if you want to add an expense, "
        "adjust your budget, check the weather, or discover great spots nearby."
    )


def _generate_insights(state: TripState) -> dict:
    insights = {}
    trip = state.get("trip", {}) or {}
    expenses = state.get("expenses", []) or []
    weather_data = state.get("weather") or {}
    weather = weather_data.get("current", {}) or {}
    itinerary = state.get("itinerary", []) or []
    
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

    if expenses:
        categories = {}
        for e in expenses:
            cat = e.get("category", "Other")
            categories[cat] = categories.get(cat, 0) + e.get("amount", 0)
        top_cat = max(categories.items(), key=lambda x: x[1])
        insights["Expense Breakdown"] = f"Highest spending on {top_cat[0]} ({top_cat[1]} {trip.get('currency', 'USD')})."

    if weather and not weather.get("error"):
        desc = weather.get("description", "").lower()
        if "rain" in desc or "storm" in desc:
            insights["Weather Alerts"] = f"Rain expected ({desc}). Carry an umbrella."
        elif "snow" in desc:
            insights["Weather Alerts"] = "Snow expected. Dress warmly."
        elif weather.get("temperature", 0) > 30:
            insights["Weather Alerts"] = "High temperatures. Stay hydrated."

    if itinerary:
        insights["Trip Progress"] = f"Itinerary planned for {len(itinerary)} days."

    return insights


def synthesizer_node(state: TripState) -> dict:
    """Produce the final response from gathered agent context."""
    if state.get("final_response"):
        logger.info("[Synthesizer] Using supervisor direct response")
        return {}

    logger.info("[Synthesizer] Generating final response")
    
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

"""
Assistant Route.
POST /assistant/chat

Runs the LangGraph pipeline (Supervisor → Agents → Synthesizer),
persists budget updates, and returns results.
"""
import time
import logging
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import jwt
from app.database.database import get_db
from app.services.trip_service import trip_service
from app.services.expense_service import expense_service
from app.services.message_service import message_service
from app.services.preference_service import preference_service
from app.graph.graph_builder import voyager_graph
from app.schemas.request import ChatRequest, TripUpdate
from app.schemas.response import ChatResponse
from app.config import settings
from app.utils.location_resolver import resolve_location, is_broad_trip, is_vague_destination

router = APIRouter(prefix="/assistant", tags=["Assistant"])
logger = logging.getLogger(__name__)


def get_current_user_id(authorization: str = Header(...)) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def _trip_to_dict(trip) -> dict:
    import json
    trip_dict = {
        "id": trip.id,
        "destination": trip.destination,
        "start_date": str(trip.start_date),
        "end_date": str(trip.end_date),
        "budget": trip.budget,
        "currency": trip.currency,
        "interests": trip.interests,
    }
    if trip.itinerary:
        try:
            trip_dict["itinerary"] = json.loads(trip.itinerary)
        except:
            trip_dict["itinerary"] = None
    return trip_dict


@router.post("/chat", response_model=ChatResponse)
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Main AI assistant endpoint."""
    start_time = time.time()
    logger.info(f"[Assistant] New chat request for trip {data.trip_id}: {data.message[:50]}")

    trip = trip_service.get_trip(db, data.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")

    expenses = expense_service.get_expenses(db, data.trip_id)
    conversation_history = message_service.get_conversation_history(db, data.trip_id)

    trip_dict = _trip_to_dict(trip)
    expenses_list = [
        {"id": e.id, "category": e.category, "amount": e.amount, "currency": e.currency}
        for e in expenses
    ]
    total_spent = sum(e.amount for e in expenses)

    # Load preferences
    prefs = preference_service.get_preferences(db, user_id)
    user_preferences = {
        "food_preference": prefs.food_preference,
        "travel_style": prefs.travel_style,
        "favorite_categories": prefs.favorite_categories
    }

    active_location, destination_update = resolve_location(
        data.message, trip.destination, conversation_history
    )
    if is_broad_trip(trip.destination) and active_location != trip.destination:
        logger.info(
            f"[Assistant] Broad trip '{trip.destination}' — current location: {active_location}"
        )
    else:
        logger.info(f"[Assistant] Resolved location: {active_location}")

    # Load saved itinerary from the trip so planning agent can detect staleness
    saved_itinerary = trip_dict.get("itinerary") or None

    initial_state = {
        "user_query": data.message,
        "execution_plan": [],
        "current_agent_index": 0,
        "trip": trip_dict,
        "active_location": active_location,
        "destination_update": destination_update,
        "itinerary": saved_itinerary,
        "weather": None,
        "nearby_places": None,
        "expenses": expenses_list,
        "remaining_budget": trip.budget - total_spent,
        "budget_update": None,
        "new_expense": None,
        "recommendations": [],
        "user_preferences": user_preferences,
        "preference_update": None,
        "insights": None,
        "conversation_history": conversation_history,
        "final_response": None,
    }

    try:
        final_state = voyager_graph.invoke(initial_state)
        logger.info(f"[Assistant] Graph completed. Plan: {final_state.get('execution_plan')}")
    except Exception as e:
        logger.error(f"[Assistant] Graph execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

    # Persist budget updates to the database
    if final_state.get("budget_update"):
        updated_trip = trip_service.update_trip(
            db, data.trip_id, TripUpdate(budget=final_state["budget_update"])
        )
        if updated_trip:
            trip_dict = _trip_to_dict(updated_trip)
            logger.info(f"[Assistant] Budget persisted: {final_state['budget_update']}")

    # Persist new expenses to the database
    if final_state.get("new_expense"):
        from app.schemas.request import ExpenseCreate
        expense_data = final_state["new_expense"]
        try:
            expense_service.create_expense(
                db,
                ExpenseCreate(
                    trip_id=data.trip_id,
                    category=expense_data["category"],
                    amount=expense_data["amount"],
                    currency=trip.currency,
                )
            )
            logger.info(f"[Assistant] Expense persisted: {expense_data}")
            # Refresh expenses list
            expenses = expense_service.get_expenses(db, data.trip_id)
            expenses_list = [
                {"id": e.id, "category": e.category, "amount": e.amount, "currency": e.currency}
                for e in expenses
            ]
            final_state["expenses"] = expenses_list
        except Exception as e:
            logger.error(f"[Assistant] Failed to persist expense: {e}")

    # Persist preference updates to the database
    if final_state.get("preference_update"):
        try:
            preference_service.update_preferences(db, user_id, final_state["preference_update"])
            logger.info(f"[Assistant] Preferences persisted: {final_state['preference_update']}")
        except Exception as e:
            logger.error(f"[Assistant] Failed to persist preferences: {e}")

    # Only when user explicitly renames the trip (e.g. "change my trip destination to Japan")
    dest_update = final_state.get("destination_update") or destination_update
    if dest_update:
        updated_trip = trip_service.update_trip(
            db, data.trip_id, TripUpdate(destination=dest_update)
        )
        if updated_trip:
            # Clear stale itinerary when destination changes — prevents old
            # Tokyo itinerary from showing up on a Mumbai trip, etc.
            trip_service.update_itinerary(db, data.trip_id, [])
            trip_dict = _trip_to_dict(updated_trip)
            logger.info(f"[Assistant] Trip destination renamed to {dest_update}, old itinerary cleared")

    # Save itinerary to database if generated
    if final_state.get("itinerary"):
        try:
            trip_service.update_itinerary(db, data.trip_id, final_state["itinerary"])
            logger.info(f"[Assistant] Itinerary saved to database")
        except Exception as e:
            logger.warning(f"[Assistant] Failed to save itinerary: {e}")

    final_response = final_state.get("final_response") or (
        "I wasn't able to generate a response. Please try again."
    )

    message_service.save_message(db, data.trip_id, "user", data.message)
    message_service.save_message(db, data.trip_id, "assistant", final_response)

    elapsed = round(time.time() - start_time, 2)
    logger.info(f"[Assistant] Request completed in {elapsed}s")

    return ChatResponse(
        execution_plan=final_state.get("execution_plan", []),
        response=final_response,
        updated_trip=trip_dict,
        itinerary=final_state.get("itinerary"),
        nearby_places=final_state.get("nearby_places"),
        remaining_budget=final_state.get("remaining_budget"),
        insights=final_state.get("insights"),
    )

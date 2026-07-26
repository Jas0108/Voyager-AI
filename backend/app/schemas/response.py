from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import date, datetime


# ─── Auth ────────────────────────────────────────────────────────────────────

class AuthResponse(BaseModel):
    token: str
    user_id: str
    email: str
    username: Optional[str] = None


# ─── Trips ───────────────────────────────────────────────────────────────────

class TripResponse(BaseModel):
    id: str
    user_id: str
    destination: str
    start_date: date
    end_date: date
    budget: float
    currency: str
    interests: str
    itinerary: Optional[List[Dict[str, Any]]] = None
    status: str = "active"
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Expenses ────────────────────────────────────────────────────────────────

class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    category: str
    amount: float
    currency: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Messages ────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    id: str
    trip_id: str
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Assistant Chat ───────────────────────────────────────────────────────────

class ChatResponse(BaseModel):
    execution_plan: List[str]
    response: str
    updated_trip: Optional[Dict[str, Any]] = None
    itinerary: Optional[List[Dict[str, Any]]] = None
    nearby_places: Optional[List[Dict[str, Any]]] = None
    remaining_budget: Optional[float] = None
    insights: Optional[Dict[str, Any]] = None


# ─── Preferences ─────────────────────────────────────────────────────────────

class PreferenceResponse(BaseModel):
    id: str
    user_id: str
    food_preference: Optional[str]
    travel_style: Optional[str]
    favorite_categories: Optional[str]
    preferred_currency: str

    class Config:
        from_attributes = True


# ─── Generic ─────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str

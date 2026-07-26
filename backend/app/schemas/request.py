from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import date


# ─── Auth ────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ─── Trips ───────────────────────────────────────────────────────────────────

class TripCreate(BaseModel):
    destination: str
    start_date: date
    end_date: date
    budget: float
    currency: Optional[str] = "USD"
    interests: str  # comma-separated e.g. "food,culture,museums"

    @field_validator("budget")
    @classmethod
    def budget_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Budget must be greater than 0")
        return v

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be after start_date")
        return v


class TripUpdate(BaseModel):
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    currency: Optional[str] = None
    interests: Optional[str] = None


# ─── Expenses ────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    trip_id: str
    category: str
    amount: float
    currency: Optional[str] = "USD"
    description: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


# ─── Assistant ───────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    trip_id: str
    message: str


# ─── Preferences ─────────────────────────────────────────────────────────────

class PreferenceUpdate(BaseModel):
    food_preference: Optional[str] = None
    travel_style: Optional[str] = None
    favorite_categories: Optional[str] = None
    preferred_currency: Optional[str] = None

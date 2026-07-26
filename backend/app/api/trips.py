"""
Trips Routes.
POST   /trips        - Create trip
GET    /trips        - Get all trips for a user
GET    /trips/{id}   - Get single trip
PUT    /trips/{id}   - Update trip
DELETE /trips/{id}   - Delete trip
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import jwt
from app.database.database import get_db
from app.services.trip_service import trip_service
from app.schemas.request import TripCreate, TripUpdate
from app.schemas.response import TripResponse
from app.config import settings

router = APIRouter(prefix="/trips", tags=["Trips"])
logger = logging.getLogger(__name__)


def get_current_user_id(authorization: str = Header(...)) -> str:
    """Extract user_id from Bearer token."""
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


@router.post("", response_model=TripResponse, status_code=201)
def create_trip(
    data: TripCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return trip_service.create_trip(db, user_id, data)


@router.get("", response_model=List[TripResponse])
def get_trips(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    trips = trip_service.get_trips(db, user_id)
    return [trip_service.trip_to_dict(trip) for trip in trips]


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return trip_service.trip_to_dict(trip)


@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: str,
    data: TripUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return trip_service.update_trip(db, trip_id, data)


@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    trip_service.delete_trip(db, trip_id)


@router.delete("/{trip_id}/itinerary", status_code=204)
def clear_itinerary(
    trip_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Clear the itinerary for a trip."""
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    trip_service.update_itinerary(db, trip_id, [])


@router.put("/{trip_id}/itinerary", response_model=TripResponse)
def update_itinerary(
    trip_id: str,
    itinerary: list,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Update the itinerary for a trip."""
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    updated_trip = trip_service.update_itinerary(db, trip_id, itinerary)
    return trip_service.trip_to_dict(updated_trip)


@router.post("/{trip_id}/complete", response_model=TripResponse)
def complete_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Mark a trip as completed."""
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    updated_trip = trip_service.complete_trip(db, trip_id)
    return trip_service.trip_to_dict(updated_trip)

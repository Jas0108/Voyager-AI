"""
Trip Service - All trip-related database operations.
Routes should never access the DB directly.
"""
from typing import List, Optional
import json
from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.schemas.request import TripCreate, TripUpdate
import logging

logger = logging.getLogger(__name__)


class TripService:
    def create_trip(self, db: Session, user_id: str, data: TripCreate) -> Trip:
        trip = Trip(
            user_id=user_id,
            destination=data.destination,
            start_date=data.start_date,
            end_date=data.end_date,
            budget=data.budget,
            currency=data.currency or "USD",
            interests=data.interests,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        logger.info(f"Trip created: {trip.id} for user {user_id}")
        return trip

    def get_trips(self, db: Session, user_id: str) -> List[Trip]:
        return db.query(Trip).filter(Trip.user_id == user_id).order_by(Trip.created_at.desc()).all()

    def get_trip(self, db: Session, trip_id: str) -> Optional[Trip]:
        return db.query(Trip).filter(Trip.id == trip_id).first()

    def update_trip(self, db: Session, trip_id: str, data: TripUpdate) -> Optional[Trip]:
        trip = self.get_trip(db, trip_id)
        if not trip:
            return None
        for field, value in data.model_dump(exclude_none=True).items():
            setattr(trip, field, value)
        db.commit()
        db.refresh(trip)
        return trip

    def update_itinerary(self, db: Session, trip_id: str, itinerary: list) -> Optional[Trip]:
        """Update the itinerary for a trip."""
        trip = self.get_trip(db, trip_id)
        if not trip:
            return None
        trip.itinerary = json.dumps(itinerary)
        db.commit()
        db.refresh(trip)
        logger.info(f"Itinerary updated for trip {trip_id}")
        return trip

    def delete_trip(self, db: Session, trip_id: str) -> bool:
        trip = self.get_trip(db, trip_id)
        if not trip:
            return False
        db.delete(trip)
        db.commit()
        return True

    def trip_to_dict(self, trip: Trip) -> dict:
        """Convert trip model to dict with parsed itinerary."""
        trip_dict = {
            "id": trip.id,
            "user_id": trip.user_id,
            "destination": trip.destination,
            "start_date": str(trip.start_date),
            "end_date": str(trip.end_date),
            "budget": trip.budget,
            "currency": trip.currency,
            "interests": trip.interests,
            "status": getattr(trip, "status", None) or "active",
            "created_at": str(trip.created_at),
        }
        if trip.itinerary:
            try:
                trip_dict["itinerary"] = json.loads(trip.itinerary)
            except:
                trip_dict["itinerary"] = None
        return trip_dict

    def complete_trip(self, db: Session, trip_id: str) -> Optional[Trip]:
        """Mark a trip as completed."""
        trip = self.get_trip(db, trip_id)
        if not trip:
            return None
        trip.status = "completed"
        db.commit()
        db.refresh(trip)
        logger.info(f"Trip {trip_id} marked as completed")
        return trip


trip_service = TripService()

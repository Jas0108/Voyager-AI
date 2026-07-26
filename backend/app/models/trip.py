import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    budget = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    interests = Column(String, nullable=False)  # comma-separated
    itinerary = Column(Text, nullable=True)  # JSON string of itinerary
    status = Column(String, nullable=True, default="active")  # "active" or "completed"
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trips")
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="trip", cascade="all, delete-orphan")

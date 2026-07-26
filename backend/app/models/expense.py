import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String, ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="expenses")

import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base


class Preference(Base):
    __tablename__ = "preferences"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    food_preference = Column(String, nullable=True)
    travel_style = Column(String, nullable=True)
    favorite_categories = Column(String, nullable=True)
    preferred_currency = Column(String, default="USD")

    user = relationship("User", back_populates="preferences")

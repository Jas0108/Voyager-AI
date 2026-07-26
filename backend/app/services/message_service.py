"""
Message Service - Conversation history persistence.
"""
from typing import List
from sqlalchemy.orm import Session
from app.models.message import Message
import logging

logger = logging.getLogger(__name__)


class MessageService:
    def save_message(self, db: Session, trip_id: str, role: str, content: str) -> Message:
        message = Message(trip_id=trip_id, role=role, content=content)
        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    def get_messages(self, db: Session, trip_id: str, limit: int = 20) -> List[Message]:
        return (
            db.query(Message)
            .filter(Message.trip_id == trip_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_conversation_history(self, db: Session, trip_id: str) -> List[dict]:
        """Return messages as list of dicts for LangGraph state."""
        messages = self.get_messages(db, trip_id, limit=10)
        messages.reverse()  # chronological order
        return [{"role": m.role, "content": m.content} for m in messages]


message_service = MessageService()

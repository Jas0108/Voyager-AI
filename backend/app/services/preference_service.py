import logging
from sqlalchemy.orm import Session
from app.models.preference import Preference

logger = logging.getLogger(__name__)

class PreferenceService:
    def get_preferences(self, db: Session, user_id: str) -> Preference:
        pref = db.query(Preference).filter(Preference.user_id == user_id).first()
        if not pref:
            pref = Preference(user_id=user_id)
            db.add(pref)
            db.commit()
            db.refresh(pref)
        return pref

    def update_preferences(self, db: Session, user_id: str, updates: dict) -> Preference:
        pref = self.get_preferences(db, user_id)
        for key, value in updates.items():
            if hasattr(pref, key) and value is not None:
                setattr(pref, key, value)
        db.commit()
        db.refresh(pref)
        logger.info(f"Preferences updated for user {user_id}")
        return pref

preference_service = PreferenceService()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Strip any accidental newlines or trailing whitespace from environment variable
clean_db_url = (settings.DATABASE_URL or "").strip()

engine = create_engine(
    clean_db_url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables on startup."""
    from app.models import user, trip, expense, message, preference  # noqa: F401
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully.")
    except Exception as e:
        logger.warning(f"Database table creation skipped or failed: {e}")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Replace direct 5432 IPv6 host with Supabase Transaction Pooler if needed
db_url = settings.DATABASE_URL
if db_url and "supabase.co:5432" in db_url:
    # Convert direct port 5432 to IPv4 pooler port 6543 for cloud hosts like Render
    db_url = db_url.replace(":5432/", ":6543/")

engine = create_engine(
    db_url,
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

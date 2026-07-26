from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings
import logging

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL or ""

# Convert direct Supabase IPv6 domain to Supabase IPv4 Pooler if on direct host
if "db." in db_url and ".supabase.co" in db_url:
    # Extract project ref (e.g. xqinlmkptgluubdvjscq)
    try:
        ref = db_url.split("db.")[1].split(".supabase.co")[0]
        # Check if user string is formatted as postgres:pass@db.ref...
        if "@db." in db_url:
            user_pass = db_url.split("@db.")[0].split("://")[1]
            if "." not in user_pass.split(":")[0]:
                user_pass = f"postgres.{ref}:{user_pass.split(':', 1)[1]}" if ":" in user_pass else user_pass
            db_url = f"postgresql+psycopg2://{user_pass}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"
    except Exception as e:
        logger.warning(f"Could not convert Supabase URL to pooler: {e}")

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

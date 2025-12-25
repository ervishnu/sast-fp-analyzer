"""Database connection and session management."""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import get_settings
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Run database migrations to add new columns if they don't exist."""
    migrations = [
        {
            "name": "Add issue_type column",
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name='vulnerability_analyses' AND column_name='issue_type'",
            "sql": "ALTER TABLE vulnerability_analyses ADD COLUMN issue_type VARCHAR(50)"
        },
        {
            "name": "Add security_category column", 
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name='vulnerability_analyses' AND column_name='security_category'",
            "sql": "ALTER TABLE vulnerability_analyses ADD COLUMN security_category VARCHAR(100)"
        },
        {
            "name": "Add created_at to default_settings",
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name='default_settings' AND column_name='created_at'",
            "sql": "ALTER TABLE default_settings ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"
        },
        {
            "name": "Add updated_at to default_settings",
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name='default_settings' AND column_name='updated_at'",
            "sql": "ALTER TABLE default_settings ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()"
        },
    ]
    
    with engine.connect() as conn:
        for migration in migrations:
            try:
                result = conn.execute(text(migration["check"]))
                if result.fetchone():
                    continue  # Column already exists
                
                logger.info(f"Running migration: {migration['name']}")
                conn.execute(text(migration["sql"]))
                conn.commit()
                logger.info(f"Migration completed: {migration['name']}")
                
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    pass  # Column already exists
                else:
                    logger.warning(f"Migration {migration['name']} skipped: {e}")


def init_db():
    """Initialize database tables."""
    from . import models  # noqa
    Base.metadata.create_all(bind=engine)
    
    # Run migrations for new columns
    try:
        run_migrations()
    except Exception as e:
        logger.warning(f"Could not run migrations (may be first run): {e}")

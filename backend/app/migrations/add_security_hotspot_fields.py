"""
Migration script to add security hotspot fields to vulnerability_analyses table.

Run this script if you're upgrading from a previous version that doesn't have 
the issue_type and security_category columns.

Usage:
    python -m app.migrations.add_security_hotspot_fields
"""
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError, ProgrammingError
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.config import get_settings

settings = get_settings()


def run_migration():
    """Add issue_type and security_category columns to vulnerability_analyses table."""
    engine = create_engine(settings.DATABASE_URL)
    
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
            "name": "Update existing records with default issue_type",
            "check": None,  # Always run after column exists
            "sql": "UPDATE vulnerability_analyses SET issue_type = 'VULNERABILITY' WHERE issue_type IS NULL"
        }
    ]
    
    with engine.connect() as conn:
        for migration in migrations:
            try:
                # Check if migration is needed
                if migration["check"]:
                    result = conn.execute(text(migration["check"]))
                    if result.fetchone():
                        print(f"Skipping: {migration['name']} - already exists")
                        continue
                
                # Run migration
                print(f"Running: {migration['name']}")
                conn.execute(text(migration["sql"]))
                conn.commit()
                print(f"Success: {migration['name']}")
                
            except (OperationalError, ProgrammingError) as e:
                if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                    print(f"Skipping: {migration['name']} - already exists")
                else:
                    print(f"Error in {migration['name']}: {e}")
                    raise
    
    print("\nMigration completed successfully!")


if __name__ == "__main__":
    run_migration()

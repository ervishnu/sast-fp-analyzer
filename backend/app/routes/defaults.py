"""API routes for default settings management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import DefaultSettings
from ..schemas import (
    DefaultSettingsCreate,
    DefaultSettingsUpdate,
    DefaultSettingsResponse
)

router = APIRouter(prefix="/defaults", tags=["defaults"])


def get_or_create_defaults(db: Session) -> DefaultSettings:
    """Get the default settings or create empty ones if not exist."""
    defaults = db.query(DefaultSettings).first()
    if not defaults:
        defaults = DefaultSettings()
        db.add(defaults)
        db.commit()
        db.refresh(defaults)
    return defaults


@router.get("", response_model=DefaultSettingsResponse)
def get_default_settings(db: Session = Depends(get_db)):
    """Get the current default settings."""
    defaults = get_or_create_defaults(db)
    return defaults


@router.put("", response_model=DefaultSettingsResponse)
def update_default_settings(
    settings: DefaultSettingsUpdate,
    db: Session = Depends(get_db)
):
    """Update the default settings."""
    defaults = get_or_create_defaults(db)
    
    update_data = settings.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(defaults, field, value)
    
    db.commit()
    db.refresh(defaults)
    return defaults


@router.delete("")
def clear_default_settings(db: Session = Depends(get_db)):
    """Clear all default settings (reset to empty)."""
    defaults = db.query(DefaultSettings).first()
    if defaults:
        # Reset all fields to None instead of deleting
        defaults.llm_url = None
        defaults.llm_model = None
        defaults.llm_api_key = None
        defaults.sonarqube_url = None
        defaults.sonarqube_api_key = None
        defaults.github_owner = None
        defaults.github_api_key = None
        db.commit()
        db.refresh(defaults)
    return {"message": "Default settings cleared"}

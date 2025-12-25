"""Configuration management API routes."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Configuration, DefaultSettings
from ..schemas import (
    ConfigurationCreate, 
    ConfigurationUpdate, 
    ConfigurationResponse,
    ConfigurationListResponse,
    ConfigurationWithDefaultsResponse
)
from ..services import SonarQubeService, GitHubService, LLMService

router = APIRouter(prefix="/configurations", tags=["configurations"])


def get_defaults(db: Session) -> DefaultSettings:
    """Get default settings or None if not configured."""
    return db.query(DefaultSettings).first()


def merge_config_with_defaults(config: Configuration, defaults: DefaultSettings) -> dict:
    """Merge configuration with default settings, returning merged values and flags."""
    result = {
        "id": config.id,
        "name": config.name,
        "is_active": config.is_active,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
        "sonarqube_project_key": config.sonarqube_project_key,
        "github_repo": config.github_repo,
        "github_branch": config.github_branch or "main",
    }
    
    # Fields that can fall back to defaults
    merge_fields = [
        ("llm_url", "llm_url"),
        ("llm_model", "llm_model"),
        ("llm_api_key", "llm_api_key"),
        ("sonarqube_url", "sonarqube_url"),
        ("sonarqube_api_key", "sonarqube_api_key"),
        ("github_owner", "github_owner"),
        ("github_api_key", "github_api_key"),
    ]
    
    for config_field, default_field in merge_fields:
        config_value = getattr(config, config_field)
        default_value = getattr(defaults, default_field) if defaults else None
        
        # Use config value if set, otherwise use default
        if config_value:
            result[config_field] = config_value
            result[f"{config_field}_from_default"] = False
        elif default_value:
            result[config_field] = default_value
            result[f"{config_field}_from_default"] = True
        else:
            result[config_field] = None
            result[f"{config_field}_from_default"] = False
    
    return result


@router.get("/", response_model=List[ConfigurationListResponse])
async def list_configurations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all configurations (without sensitive data)."""
    configurations = db.query(Configuration).offset(skip).limit(limit).all()
    return configurations


@router.post("/", response_model=ConfigurationResponse)
async def create_configuration(
    config: ConfigurationCreate,
    db: Session = Depends(get_db)
):
    """Create a new configuration."""
    # Check if name already exists
    existing = db.query(Configuration).filter(Configuration.name == config.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Configuration with this name already exists")
    
    db_config = Configuration(**config.model_dump())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config


@router.get("/{config_id}", response_model=ConfigurationResponse)
async def get_configuration(config_id: int, db: Session = Depends(get_db)):
    """Get a specific configuration by ID."""
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    return config


@router.get("/{config_id}/merged", response_model=ConfigurationWithDefaultsResponse)
async def get_configuration_merged(config_id: int, db: Session = Depends(get_db)):
    """Get a specific configuration with defaults merged in."""
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    defaults = get_defaults(db)
    return merge_config_with_defaults(config, defaults)


@router.put("/{config_id}", response_model=ConfigurationResponse)
async def update_configuration(
    config_id: int,
    config_update: ConfigurationUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing configuration."""
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    update_data = config_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config


@router.delete("/{config_id}")
async def delete_configuration(config_id: int, db: Session = Depends(get_db)):
    """Delete a configuration."""
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    db.delete(config)
    db.commit()
    return {"message": "Configuration deleted successfully"}


@router.post("/{config_id}/test")
async def test_configuration(config_id: int, db: Session = Depends(get_db)):
    """Test all connections for a configuration."""
    config = db.query(Configuration).filter(Configuration.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Get merged configuration with defaults
    defaults = get_defaults(db)
    merged = merge_config_with_defaults(config, defaults)
    
    results = {
        "sonarqube": False,
        "github": False,
        "llm": False,
        "errors": []
    }
    
    # Check required fields
    missing_fields = []
    if not merged.get("llm_url"):
        missing_fields.append("LLM URL")
    if not merged.get("llm_model"):
        missing_fields.append("LLM Model")
    if not merged.get("sonarqube_api_key"):
        missing_fields.append("SonarQube API Key")
    if not merged.get("github_owner"):
        missing_fields.append("GitHub Owner")
    if not merged.get("github_api_key"):
        missing_fields.append("GitHub API Key")
    
    if missing_fields:
        results["errors"].append(f"Missing required fields (not set in config or defaults): {', '.join(missing_fields)}")
        results["all_passed"] = False
        return results
    
    # Test SonarQube
    try:
        sonar_url = merged.get("sonarqube_url") or "https://sonarcloud.io"
        sonar_service = SonarQubeService(sonar_url, merged["sonarqube_api_key"])
        results["sonarqube"] = await sonar_service.test_connection(config.sonarqube_project_key)
        if not results["sonarqube"]:
            results["errors"].append("SonarQube: Failed to connect or project not found")
    except Exception as e:
        results["errors"].append(f"SonarQube: {str(e)}")
    
    # Test GitHub
    try:
        github_service = GitHubService(
            merged["github_api_key"], 
            merged["github_owner"], 
            config.github_repo,
            config.github_branch or "main"
        )
        results["github"] = await github_service.test_connection()
        if not results["github"]:
            results["errors"].append("GitHub: Failed to connect or repository not found")
    except Exception as e:
        results["errors"].append(f"GitHub: {str(e)}")
    
    # Test LLM
    try:
        llm_service = LLMService(merged["llm_url"], merged["llm_model"], merged.get("llm_api_key"))
        results["llm"] = await llm_service.test_connection()
        if not results["llm"]:
            results["errors"].append("LLM: Failed to connect to LLM service")
    except Exception as e:
        results["errors"].append(f"LLM: {str(e)}")
    
    results["all_passed"] = all([results["sonarqube"], results["github"], results["llm"]])
    
    return results

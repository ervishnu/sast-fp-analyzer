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
        "sonarqube_project_name": getattr(config, 'sonarqube_project_name', None),
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
    import traceback
    
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
        "errors": [],
        "details": {
            "sonarqube": {"success": False, "message": "", "error_type": None, "error_details": None},
            "github": {"success": False, "message": "", "error_type": None, "error_details": None},
            "llm": {"success": False, "message": "", "error_type": None, "error_details": None}
        }
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
        error_msg = f"Missing required fields (not set in config or defaults): {', '.join(missing_fields)}"
        results["errors"].append(error_msg)
        results["details"]["sonarqube"]["message"] = "Missing SonarQube API Key" if "SonarQube API Key" in missing_fields else "Skipped due to missing fields"
        results["details"]["github"]["message"] = "Missing GitHub Owner or API Key" if any(f in missing_fields for f in ["GitHub Owner", "GitHub API Key"]) else "Skipped due to missing fields"
        results["details"]["llm"]["message"] = "Missing LLM URL or Model" if any(f in missing_fields for f in ["LLM URL", "LLM Model"]) else "Skipped due to missing fields"
        results["all_passed"] = False
        return results
    
    # Test SonarQube
    try:
        sonar_url = merged.get("sonarqube_url") or "https://sonarcloud.io"
        sonar_service = SonarQubeService(sonar_url, merged["sonarqube_api_key"])
        
        # Pass both project_key and project_name - the service will resolve as needed
        test_result = await sonar_service.test_connection(
            project_key=config.sonarqube_project_key,
            project_name=config.sonarqube_project_name
        )
        
        results["sonarqube"] = test_result["success"]
        resolved_key = test_result.get("resolved_key", config.sonarqube_project_key)
        resolution_info = test_result.get("resolution_info", "")
        
        project_display = config.sonarqube_project_key or config.sonarqube_project_name
        success_message = f"Successfully connected to {sonar_url} and verified project"
        if config.sonarqube_project_name and not config.sonarqube_project_key:
            success_message += f" (Name: '{config.sonarqube_project_name}' → Key: '{resolved_key}')"
        else:
            success_message += f" '{resolved_key}'"
        
        results["details"]["sonarqube"] = {
            "success": True,
            "message": success_message,
            "error_type": None,
            "error_details": resolution_info,
            "resolved_project_key": resolved_key
        }
    except Exception as e:
        error_msg = str(e)
        results["sonarqube"] = False
        results["errors"].append(f"SonarQube: {error_msg}")
        
        project_info = ""
        if config.sonarqube_project_key:
            project_info = f"Project Key: {config.sonarqube_project_key}"
        elif config.sonarqube_project_name:
            project_info = f"Project Name: {config.sonarqube_project_name}"
        else:
            project_info = "No project key or name provided"
        
        results["details"]["sonarqube"] = {
            "success": False,
            "message": error_msg,
            "error_type": type(e).__name__,
            "error_details": f"URL: {merged.get('sonarqube_url') or 'https://sonarcloud.io'}\n{project_info}\n\nFull Error:\n{traceback.format_exc()}"
        }
    
    # Test GitHub
    try:
        github_service = GitHubService(
            merged["github_api_key"], 
            merged["github_owner"], 
            config.github_repo,
            config.github_branch or "main"
        )
        results["github"] = await github_service.test_connection()
        results["details"]["github"] = {
            "success": True,
            "message": f"Successfully connected to {merged['github_owner']}/{config.github_repo} (branch: {config.github_branch or 'main'})",
            "error_type": None,
            "error_details": None
        }
    except Exception as e:
        error_msg = str(e)
        results["github"] = False
        results["errors"].append(f"GitHub: {error_msg}")
        results["details"]["github"] = {
            "success": False,
            "message": error_msg,
            "error_type": type(e).__name__,
            "error_details": f"Repository: {merged.get('github_owner')}/{config.github_repo}\nBranch: {config.github_branch or 'main'}\n\nFull Error:\n{traceback.format_exc()}"
        }
    
    # Test LLM
    try:
        llm_service = LLMService(merged["llm_url"], merged["llm_model"], merged.get("llm_api_key"))
        results["llm"] = await llm_service.test_connection()
        results["details"]["llm"] = {
            "success": True,
            "message": f"Successfully connected to {merged['llm_url']} using model '{merged['llm_model']}'",
            "error_type": None,
            "error_details": None
        }
    except Exception as e:
        error_msg = str(e)
        results["llm"] = False
        results["errors"].append(f"LLM: {error_msg}")
        results["details"]["llm"] = {
            "success": False,
            "message": error_msg,
            "error_type": type(e).__name__,
            "error_details": f"URL: {merged.get('llm_url')}\nModel: {merged.get('llm_model')}\n\nFull Error:\n{traceback.format_exc()}"
        }
    
    results["all_passed"] = all([results["sonarqube"], results["github"], results["llm"]])
    
    return results

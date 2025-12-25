"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# Default Settings Schemas
class DefaultSettingsBase(BaseModel):
    """Base schema for default settings."""
    # LLM Settings
    llm_url: Optional[str] = Field(None, description="Default LM Studio or OpenAI compatible API URL")
    llm_model: Optional[str] = Field(None, description="Default model name to use")
    llm_api_key: Optional[str] = Field(None, description="Default API key for LLM")
    
    # SonarQube Settings (project key is always per-configuration)
    sonarqube_url: Optional[str] = Field(None, description="Default SonarQube/SonarCloud URL")
    sonarqube_api_key: Optional[str] = Field(None, description="Default SonarQube API token")
    
    # GitHub Settings (repo and branch are always per-configuration)
    github_owner: Optional[str] = Field(None, description="Default GitHub repository owner")
    github_api_key: Optional[str] = Field(None, description="Default GitHub personal access token")


class DefaultSettingsCreate(DefaultSettingsBase):
    """Schema for creating/updating default settings."""
    pass


class DefaultSettingsUpdate(DefaultSettingsBase):
    """Schema for updating default settings."""
    pass


class DefaultSettingsResponse(DefaultSettingsBase):
    """Schema for default settings response."""
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Configuration Schemas
class ConfigurationBase(BaseModel):
    """Base configuration schema."""
    name: str = Field(..., min_length=1, max_length=100)
    
    # LLM Settings (optional - can use defaults)
    llm_url: Optional[str] = Field(None, description="LM Studio or OpenAI compatible API URL")
    llm_model: Optional[str] = Field(None, description="Model name to use")
    llm_api_key: Optional[str] = Field(None, description="API key for LLM (optional for local)")
    
    # SonarQube Settings
    sonarqube_url: Optional[str] = Field(None, description="SonarQube/SonarCloud URL")
    sonarqube_api_key: Optional[str] = Field(None, description="SonarQube API token")
    sonarqube_project_key: Optional[str] = Field(None, description="SonarQube project key")
    sonarqube_project_name: Optional[str] = Field(None, description="SonarQube project name (alternative to key)")
    
    # GitHub Settings
    github_owner: Optional[str] = Field(None, description="GitHub repository owner")
    github_repo: str = Field(..., description="GitHub repository name (required)")
    github_api_key: Optional[str] = Field(None, description="GitHub personal access token")
    github_branch: str = Field(default="main", description="Branch to fetch code from")


class ConfigurationCreate(ConfigurationBase):
    """Schema for creating a configuration."""
    pass


class ConfigurationUpdate(BaseModel):
    """Schema for updating a configuration."""
    name: Optional[str] = None
    llm_url: Optional[str] = None
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
    sonarqube_url: Optional[str] = None
    sonarqube_api_key: Optional[str] = None
    sonarqube_project_key: Optional[str] = None
    sonarqube_project_name: Optional[str] = None
    github_owner: Optional[str] = None
    github_repo: Optional[str] = None
    github_api_key: Optional[str] = None
    github_branch: Optional[str] = None
    is_active: Optional[bool] = None


class ConfigurationResponse(ConfigurationBase):
    """Schema for configuration response."""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ConfigurationWithDefaultsResponse(BaseModel):
    """Schema for configuration response with merged defaults."""
    id: int
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Merged values (from config or defaults)
    llm_url: Optional[str] = None
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None
    sonarqube_url: Optional[str] = None
    sonarqube_api_key: Optional[str] = None
    sonarqube_project_key: str
    github_owner: Optional[str] = None
    github_repo: str
    github_api_key: Optional[str] = None
    github_branch: str
    
    # Flags indicating which values are from defaults
    llm_url_from_default: bool = False
    llm_model_from_default: bool = False
    llm_api_key_from_default: bool = False
    sonarqube_url_from_default: bool = False
    sonarqube_api_key_from_default: bool = False
    github_owner_from_default: bool = False
    github_api_key_from_default: bool = False
    
    class Config:
        from_attributes = True


class ConfigurationListResponse(BaseModel):
    """Schema for listing configurations (without sensitive data)."""
    id: int
    name: str
    sonarqube_project_key: Optional[str] = None
    sonarqube_project_name: Optional[str] = None
    github_owner: Optional[str] = None
    github_repo: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Vulnerability Analysis Schemas
class VulnerabilityAnalysisResponse(BaseModel):
    """Schema for vulnerability analysis response."""
    id: int
    file_path: str
    line_number: Optional[int]
    vulnerability_type: Optional[str]
    issue_type: Optional[str] = None  # VULNERABILITY, SECURITY_HOTSPOT
    security_category: Optional[str] = None  # For security hotspots
    original_message: Optional[str]
    severity: Optional[str]
    triage: Optional[str]
    confidence: Optional[float]
    short_reason: Optional[str]
    detailed_explanation: Optional[str]
    fix_suggestion: Optional[str]
    severity_override: Optional[str]
    prompt_sent: Optional[str] = None
    analyzed_at: datetime
    
    class Config:
        from_attributes = True


# Scan Result Schemas
class ScanResultBase(BaseModel):
    """Base scan result schema."""
    configuration_id: int


class ScanResultResponse(BaseModel):
    """Schema for scan result response."""
    id: int
    configuration_id: int
    scan_started_at: datetime
    scan_completed_at: Optional[datetime]
    status: str
    error_message: Optional[str]
    total_vulnerabilities: int
    false_positives: int
    true_positives: int
    needs_review: int
    
    class Config:
        from_attributes = True


class ScanResultDetailResponse(ScanResultResponse):
    """Schema for detailed scan result with analyses."""
    vulnerability_analyses: List[VulnerabilityAnalysisResponse]
    
    class Config:
        from_attributes = True


# Scan Request Schema
class ScanRequest(BaseModel):
    """Schema for initiating a scan."""
    configuration_id: int


class ScanStatusResponse(BaseModel):
    """Schema for scan status response."""
    scan_id: int
    status: str
    progress: Optional[int] = None
    message: Optional[str] = None


# Statistics Schema
class StatisticsResponse(BaseModel):
    """Schema for dashboard statistics."""
    total_scans: int
    total_vulnerabilities_analyzed: int
    false_positive_rate: float
    true_positive_rate: float
    needs_review_rate: float
    recent_scans: List[ScanResultResponse]

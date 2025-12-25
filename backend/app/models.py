"""Database models for SAST analyzer."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class DefaultSettings(Base):
    """Stores default/global configuration settings."""
    __tablename__ = "default_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # LLM Settings (defaults)
    llm_url = Column(String(500), nullable=True)
    llm_model = Column(String(200), nullable=True)
    llm_api_key = Column(String(500), nullable=True)
    
    # SonarQube Settings (defaults - except project key)
    sonarqube_url = Column(String(500), nullable=True)
    sonarqube_api_key = Column(String(500), nullable=True)
    
    # GitHub Settings (defaults - except repo name and branch)
    github_owner = Column(String(200), nullable=True)
    github_api_key = Column(String(500), nullable=True)
    
    # Metadata
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Configuration(Base):
    """Stores application configuration settings."""
    __tablename__ = "configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    
    # LLM Settings (nullable - will use defaults if empty)
    llm_url = Column(String(500), nullable=True)
    llm_model = Column(String(200), nullable=True)
    llm_api_key = Column(String(500), nullable=True)
    
    # SonarQube Settings
    sonarqube_url = Column(String(500), nullable=True)
    sonarqube_api_key = Column(String(500), nullable=True)
    sonarqube_project_key = Column(String(200), nullable=False)  # Required
    
    # GitHub Settings
    github_owner = Column(String(200), nullable=True)
    github_repo = Column(String(200), nullable=False)  # Required
    github_api_key = Column(String(500), nullable=True)
    github_branch = Column(String(100), default="main")  # Required with default
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    scan_results = relationship("ScanResult", back_populates="configuration")


class ScanResult(Base):
    """Stores scan results for a configuration."""
    __tablename__ = "scan_results"
    
    id = Column(Integer, primary_key=True, index=True)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=False)
    
    # Scan metadata
    scan_started_at = Column(DateTime, default=datetime.utcnow)
    scan_completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="pending")  # pending, running, completed, failed
    error_message = Column(Text, nullable=True)
    
    # Statistics
    total_vulnerabilities = Column(Integer, default=0)
    false_positives = Column(Integer, default=0)
    true_positives = Column(Integer, default=0)
    needs_review = Column(Integer, default=0)
    
    # Relationships
    configuration = relationship("Configuration", back_populates="scan_results")
    vulnerability_analyses = relationship("VulnerabilityAnalysis", back_populates="scan_result")


class VulnerabilityAnalysis(Base):
    """Stores individual vulnerability analysis results."""
    __tablename__ = "vulnerability_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    scan_result_id = Column(Integer, ForeignKey("scan_results.id"), nullable=False)
    
    # Vulnerability info from SonarQube
    file_path = Column(String(500), nullable=False)
    line_number = Column(Integer, nullable=True)
    vulnerability_type = Column(String(200), nullable=True)
    original_message = Column(Text, nullable=True)
    severity = Column(String(50), nullable=True)
    sonarqube_key = Column(String(200), nullable=True)
    
    # AI Analysis results
    triage = Column(String(50), nullable=True)  # false_positive, true_positive, needs_human_review
    confidence = Column(Float, nullable=True)
    short_reason = Column(Text, nullable=True)
    detailed_explanation = Column(Text, nullable=True)
    fix_suggestion = Column(Text, nullable=True)
    severity_override = Column(String(50), nullable=True)
    
    # Raw data
    source_code_snippet = Column(Text, nullable=True)
    raw_llm_response = Column(JSON, nullable=True)
    prompt_sent = Column(Text, nullable=True)  # The full prompt sent to LLM
    
    # Metadata
    analyzed_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scan_result = relationship("ScanResult", back_populates="vulnerability_analyses")

"""Scan management API routes."""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import asyncio
import logging

from ..database import get_db
from ..models import Configuration, ScanResult, VulnerabilityAnalysis, DefaultSettings
from ..schemas import (
    ScanRequest,
    ScanResultResponse,
    ScanResultDetailResponse,
    ScanStatusResponse
)
from ..services import SonarQubeService, GitHubService, LLMService

router = APIRouter(prefix="/scans", tags=["scans"])
logger = logging.getLogger(__name__)

# In-memory scan progress tracking
scan_progress = {}

# In-memory scan control (pause, stop)
scan_control = {}


def get_merged_config_values(config: Configuration, defaults: DefaultSettings) -> dict:
    """Merge configuration with default settings for scan execution."""
    return {
        "llm_url": config.llm_url or (defaults.llm_url if defaults else None),
        "llm_model": config.llm_model or (defaults.llm_model if defaults else None),
        "llm_api_key": config.llm_api_key or (defaults.llm_api_key if defaults else None),
        "sonarqube_url": config.sonarqube_url or (defaults.sonarqube_url if defaults else None) or "https://sonarcloud.io",
        "sonarqube_api_key": config.sonarqube_api_key or (defaults.sonarqube_api_key if defaults else None),
        "sonarqube_project_key": config.sonarqube_project_key,
        "sonarqube_project_name": getattr(config, 'sonarqube_project_name', None),
        "github_owner": config.github_owner or (defaults.github_owner if defaults else None),
        "github_repo": config.github_repo,
        "github_api_key": config.github_api_key or (defaults.github_api_key if defaults else None),
        "github_branch": config.github_branch or "main",
    }


async def run_scan(scan_id: int, config_id: int, db_url: str):
    """Background task to run the vulnerability analysis scan."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Reload configuration in this session
        config = db.query(Configuration).filter(Configuration.id == config_id).first()
        if not config:
            logger.error(f"Configuration {config_id} not found")
            scan_progress[scan_id] = {"status": "failed", "progress": 0, "message": "Configuration not found"}
            return
        
        # Get default settings
        defaults = db.query(DefaultSettings).first()
        merged = get_merged_config_values(config, defaults)
        
        # Validate required merged values
        missing_fields = []
        if not merged["llm_url"]:
            missing_fields.append("LLM URL")
        if not merged["llm_model"]:
            missing_fields.append("LLM Model")
        if not merged["sonarqube_api_key"]:
            missing_fields.append("SonarQube API Key")
        if not merged["sonarqube_project_key"] and not merged.get("sonarqube_project_name"):
            missing_fields.append("SonarQube Project Key or Project Name")
        if not merged["github_owner"]:
            missing_fields.append("GitHub Owner")
        if not merged["github_api_key"]:
            missing_fields.append("GitHub API Key")
        
        if missing_fields:
            scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
            if scan:
                scan.status = "failed"
                scan.error_message = f"Missing required fields (not set in config or defaults): {', '.join(missing_fields)}"
                scan.scan_completed_at = datetime.utcnow()
                db.commit()
            scan_progress[scan_id] = {"status": "failed", "progress": 0, "message": f"Missing fields: {', '.join(missing_fields)}"}
            return
        
        scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if not scan:
            logger.error(f"Scan {scan_id} not found")
            return
        
        scan.status = "running"
        db.commit()
        
        scan_progress[scan_id] = {"status": "running", "progress": 0, "message": "Starting scan..."}
        scan_control[scan_id] = {"action": None}  # Initialize control
        
        # Initialize services with merged configuration
        sonar_service = SonarQubeService(merged["sonarqube_url"], merged["sonarqube_api_key"])
        github_service = GitHubService(
            merged["github_api_key"],
            merged["github_owner"],
            merged["github_repo"],
            merged["github_branch"]
        )
        llm_service = LLMService(merged["llm_url"], merged["llm_model"], merged["llm_api_key"])
        
        # Resolve project key from name if needed
        project_key = await sonar_service.resolve_project_key(
            project_key=merged["sonarqube_project_key"],
            project_name=merged.get("sonarqube_project_name")
        )
        
        if not project_key:
            scan.status = "failed"
            scan.error_message = "Could not resolve SonarQube project. Please check the project key or name."
            scan.scan_completed_at = datetime.utcnow()
            db.commit()
            scan_progress[scan_id] = {"status": "failed", "progress": 0, "message": "Could not resolve SonarQube project"}
            return
        
        scan_progress[scan_id]["message"] = f"Resolved project: {project_key}. Fetching vulnerabilities..."
        
        # Fetch vulnerabilities and security hotspots
        scan_progress[scan_id]["message"] = "Fetching vulnerabilities and security hotspots from SonarQube..."
        issues = await sonar_service.fetch_all_vulnerabilities(project_key, include_hotspots=True)
        
        if not issues:
            scan.status = "completed"
            scan.scan_completed_at = datetime.utcnow()
            scan.total_vulnerabilities = 0
            db.commit()
            scan_progress[scan_id] = {"status": "completed", "progress": 100, "message": "No vulnerabilities or security hotspots found"}
            return
        
        # Group by file for efficient source code fetching
        grouped_vulns = sonar_service.group_vulnerabilities_by_file(issues)
        total_vulnerabilities = len(issues)
        scan.total_vulnerabilities = total_vulnerabilities
        db.commit()
        
        scan_progress[scan_id]["message"] = f"Found {total_vulnerabilities} vulnerabilities in {len(grouped_vulns)} files"
        
        false_positives = 0
        true_positives = 0
        needs_review = 0
        processed_vulns = 0
        
        # Cache for source code to avoid re-fetching
        source_code_cache = {}
        
        # Process each file and each vulnerability individually
        for file_path, vulnerabilities in grouped_vulns.items():
            # Fetch source code once per file (use cache)
            if file_path not in source_code_cache:
                source_code = await github_service.get_file_content(file_path)
                if not source_code:
                    source_code = await github_service.get_file_content_raw(file_path)
                source_code_cache[file_path] = source_code
            else:
                source_code = source_code_cache[file_path]
            
            # Process each vulnerability individually
            for vuln in vulnerabilities:
                # Check for pause/stop control
                control = scan_control.get(scan_id, {})
                
                # Handle stop request
                if control.get("action") == "stop":
                    scan.status = "stopped"
                    scan.scan_completed_at = datetime.utcnow()
                    scan.false_positives = false_positives
                    scan.true_positives = true_positives
                    scan.needs_review = needs_review
                    db.commit()
                    scan_progress[scan_id] = {
                        "status": "stopped",
                        "progress": progress if 'progress' in dir() else 0,
                        "message": f"Scan stopped by user. Processed {processed_vulns}/{total_vulnerabilities}"
                    }
                    return
                
                # Handle pause request - wait until resumed
                while control.get("action") == "pause":
                    scan.status = "paused"
                    db.commit()
                    scan_progress[scan_id]["status"] = "paused"
                    scan_progress[scan_id]["message"] = f"Scan paused at {processed_vulns}/{total_vulnerabilities}. Waiting to resume..."
                    await asyncio.sleep(1)
                    control = scan_control.get(scan_id, {})
                
                # Resume if was paused
                if scan.status == "paused":
                    scan.status = "running"
                    db.commit()
                    scan_progress[scan_id]["status"] = "running"
                
                processed_vulns += 1
                progress = int((processed_vulns / total_vulnerabilities) * 100)
                vuln_key = vuln.get("key", "unknown")
                
                scan_progress[scan_id]["progress"] = progress
                scan_progress[scan_id]["message"] = f"Analyzing vulnerability {processed_vulns}/{total_vulnerabilities}: {vuln_key}"
                
                if not source_code:
                    # Skip vulnerabilities where source code can't be fetched
                    logger.warning(f"Could not fetch source code for {file_path}")
                    analysis = VulnerabilityAnalysis(
                        scan_result_id=scan_id,
                        file_path=file_path,
                        line_number=vuln.get("line"),
                        vulnerability_type=vuln.get("rule"),
                        original_message=vuln.get("message"),
                        severity=vuln.get("severity"),
                        issue_type=vuln.get("issue_type", "VULNERABILITY"),
                        security_category=vuln.get("security_category"),
                        sonarqube_key=vuln_key,
                        triage="needs_human_review",
                        confidence=0.0,
                        short_reason="Could not fetch source code from GitHub"
                    )
                    db.add(analysis)
                    needs_review += 1
                    db.commit()
                    continue
                
                # Analyze this single vulnerability with LLM
                try:
                    result = await llm_service.analyze_vulnerability(
                        file_path=file_path,
                        source_code=source_code,
                        vulnerability=vuln  # Pass single vulnerability
                    )
                    
                    triage = result.get("triage", "needs_human_review")
                    
                    if triage == "false_positive":
                        false_positives += 1
                    elif triage == "true_positive":
                        true_positives += 1
                    else:
                        needs_review += 1
                    
                    # Create analysis record for this vulnerability
                    analysis = VulnerabilityAnalysis(
                        scan_result_id=scan_id,
                        file_path=file_path,
                        line_number=vuln.get("line"),
                        vulnerability_type=vuln.get("rule"),
                        original_message=vuln.get("message"),
                        severity=vuln.get("severity"),
                        issue_type=vuln.get("issue_type", "VULNERABILITY"),
                        security_category=vuln.get("security_category"),
                        sonarqube_key=vuln_key,
                        triage=result.get("triage"),
                        confidence=result.get("confidence"),
                        short_reason=result.get("short_reason"),
                        detailed_explanation=result.get("detailed_explanation"),
                        fix_suggestion=result.get("fix_suggestion"),
                        severity_override=result.get("severity_override"),
                        source_code_snippet=source_code[:5000] if source_code else None,
                        raw_llm_response=result,
                        prompt_sent=result.get("prompt_sent")
                    )
                    db.add(analysis)
                    db.commit()
                    
                except Exception as e:
                    logger.error(f"Error analyzing vulnerability {vuln_key}: {e}")
                    analysis = VulnerabilityAnalysis(
                        scan_result_id=scan_id,
                        file_path=file_path,
                        line_number=vuln.get("line"),
                        vulnerability_type=vuln.get("rule"),
                        original_message=vuln.get("message"),
                        severity=vuln.get("severity"),
                        issue_type=vuln.get("issue_type", "VULNERABILITY"),
                        security_category=vuln.get("security_category"),
                        sonarqube_key=vuln_key,
                        triage="needs_human_review",
                        confidence=0.0,
                        short_reason=f"Analysis error: {str(e)}"
                    )
                    db.add(analysis)
                    needs_review += 1
                    db.commit()
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.3)
        
        # Update final scan results
        scan.status = "completed"
        scan.scan_completed_at = datetime.utcnow()
        scan.false_positives = false_positives
        scan.true_positives = true_positives
        scan.needs_review = needs_review
        db.commit()
        
        scan_progress[scan_id] = {
            "status": "completed", 
            "progress": 100, 
            "message": f"Scan completed. FP: {false_positives}, TP: {true_positives}, Review: {needs_review}"
        }
        
        # Clean up control
        if scan_id in scan_control:
            del scan_control[scan_id]
        
    except Exception as e:
        logger.error(f"Scan {scan_id} failed: {e}")
        scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
        if scan:
            scan.status = "failed"
            scan.error_message = str(e)
            scan.scan_completed_at = datetime.utcnow()
            db.commit()
        
        scan_progress[scan_id] = {"status": "failed", "progress": 0, "message": str(e)}
    
    finally:
        db.close()


@router.post("/", response_model=ScanStatusResponse)
async def start_scan(
    request: ScanRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start a new vulnerability analysis scan."""
    # Get configuration
    config = db.query(Configuration).filter(Configuration.id == request.configuration_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # Create scan record
    scan = ScanResult(
        configuration_id=config.id,
        status="pending"
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    # Get database URL for background task
    from ..config import get_settings
    settings = get_settings()
    
    # Start background scan - pass config.id instead of config object
    background_tasks.add_task(run_scan, scan.id, config.id, settings.DATABASE_URL)
    
    return ScanStatusResponse(
        scan_id=scan.id,
        status="pending",
        message="Scan started successfully"
    )


@router.get("/", response_model=List[ScanResultResponse])
async def list_scans(
    configuration_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all scan results."""
    query = db.query(ScanResult)
    if configuration_id:
        query = query.filter(ScanResult.configuration_id == configuration_id)
    
    scans = query.order_by(ScanResult.scan_started_at.desc()).offset(skip).limit(limit).all()
    return scans


@router.get("/{scan_id}", response_model=ScanResultDetailResponse)
async def get_scan(scan_id: int, db: Session = Depends(get_db)):
    """Get detailed scan result with all vulnerability analyses."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/{scan_id}/status", response_model=ScanStatusResponse)
async def get_scan_status(scan_id: int, db: Session = Depends(get_db)):
    """Get current status of a running scan."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Check in-memory progress
    if scan_id in scan_progress:
        progress_info = scan_progress[scan_id]
        return ScanStatusResponse(
            scan_id=scan_id,
            status=progress_info.get("status", scan.status),
            progress=progress_info.get("progress"),
            message=progress_info.get("message")
        )
    
    return ScanStatusResponse(
        scan_id=scan_id,
        status=scan.status,
        message=scan.error_message
    )


@router.post("/{scan_id}/pause")
async def pause_scan(scan_id: int, db: Session = Depends(get_db)):
    """Pause a running scan."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status not in ["running", "pending"]:
        raise HTTPException(status_code=400, detail=f"Cannot pause scan with status: {scan.status}")
    
    scan_control[scan_id] = {"action": "pause"}
    return {"message": "Pause request sent", "scan_id": scan_id}


@router.post("/{scan_id}/resume")
async def resume_scan(scan_id: int, db: Session = Depends(get_db)):
    """Resume a paused scan."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status != "paused" and scan_control.get(scan_id, {}).get("action") != "pause":
        raise HTTPException(status_code=400, detail=f"Cannot resume scan with status: {scan.status}")
    
    scan_control[scan_id] = {"action": None}  # Clear pause
    return {"message": "Resume request sent", "scan_id": scan_id}


@router.post("/{scan_id}/stop")
async def stop_scan(scan_id: int, db: Session = Depends(get_db)):
    """Stop a running or paused scan."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status not in ["running", "pending", "paused"]:
        raise HTTPException(status_code=400, detail=f"Cannot stop scan with status: {scan.status}")
    
    scan_control[scan_id] = {"action": "stop"}
    return {"message": "Stop request sent", "scan_id": scan_id}


@router.delete("/{scan_id}")
async def delete_scan(scan_id: int, db: Session = Depends(get_db)):
    """Delete a scan and its analyses."""
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    # Delete associated analyses
    db.query(VulnerabilityAnalysis).filter(VulnerabilityAnalysis.scan_result_id == scan_id).delete()
    db.delete(scan)
    db.commit()
    
    return {"message": "Scan deleted successfully"}

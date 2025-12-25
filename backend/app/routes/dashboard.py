"""Dashboard and statistics API routes."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import ScanResult, VulnerabilityAnalysis
from ..schemas import StatisticsResponse, ScanResultResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/statistics", response_model=StatisticsResponse)
async def get_statistics(db: Session = Depends(get_db)):
    """Get dashboard statistics."""
    # Total scans
    total_scans = db.query(ScanResult).count()
    
    # Total vulnerabilities analyzed
    total_vulns = db.query(VulnerabilityAnalysis).count()
    
    # Calculate rates
    if total_vulns > 0:
        false_positive_count = db.query(VulnerabilityAnalysis).filter(
            VulnerabilityAnalysis.triage == "false_positive"
        ).count()
        true_positive_count = db.query(VulnerabilityAnalysis).filter(
            VulnerabilityAnalysis.triage == "true_positive"
        ).count()
        needs_review_count = db.query(VulnerabilityAnalysis).filter(
            VulnerabilityAnalysis.triage == "needs_human_review"
        ).count()
        
        false_positive_rate = false_positive_count / total_vulns
        true_positive_rate = true_positive_count / total_vulns
        needs_review_rate = needs_review_count / total_vulns
    else:
        false_positive_rate = 0.0
        true_positive_rate = 0.0
        needs_review_rate = 0.0
    
    # Recent scans
    recent_scans = db.query(ScanResult).order_by(
        ScanResult.scan_started_at.desc()
    ).limit(5).all()
    
    return StatisticsResponse(
        total_scans=total_scans,
        total_vulnerabilities_analyzed=total_vulns,
        false_positive_rate=false_positive_rate,
        true_positive_rate=true_positive_rate,
        needs_review_rate=needs_review_rate,
        recent_scans=[ScanResultResponse.model_validate(s) for s in recent_scans]
    )


@router.get("/vulnerabilities/by-triage")
async def get_vulnerabilities_by_triage(db: Session = Depends(get_db)):
    """Get vulnerability count grouped by triage result."""
    results = db.query(
        VulnerabilityAnalysis.triage,
        func.count(VulnerabilityAnalysis.id).label("count")
    ).group_by(VulnerabilityAnalysis.triage).all()
    
    return {r.triage or "unknown": r.count for r in results}


@router.get("/vulnerabilities/by-severity")
async def get_vulnerabilities_by_severity(db: Session = Depends(get_db)):
    """Get vulnerability count grouped by severity."""
    results = db.query(
        VulnerabilityAnalysis.severity,
        func.count(VulnerabilityAnalysis.id).label("count")
    ).group_by(VulnerabilityAnalysis.severity).all()
    
    return {r.severity or "unknown": r.count for r in results}


@router.get("/vulnerabilities/by-type")
async def get_vulnerabilities_by_type(db: Session = Depends(get_db)):
    """Get vulnerability count grouped by type."""
    results = db.query(
        VulnerabilityAnalysis.vulnerability_type,
        func.count(VulnerabilityAnalysis.id).label("count")
    ).group_by(VulnerabilityAnalysis.vulnerability_type).all()
    
    return {r.vulnerability_type or "unknown": r.count for r in results}

from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.api import deps
from app.models import User, Project, Sample, ProjectStatus, SampleStatus

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get dashboard statistics"""
    
    # Count active projects (not complete or cancelled)
    active_projects = db.query(func.count(Project.id)).filter(
        ~Project.status.in_([ProjectStatus.complete, ProjectStatus.cancelled])
    ).scalar() or 0
    
    # Total count of all samples
    total_samples = db.query(func.count(Sample.id)).scalar() or 0
    
    # Count projects completed in current month
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    completed_this_month = db.query(func.count(Project.id)).filter(
        Project.status == ProjectStatus.complete,
        Project.updated_at >= current_month_start
    ).scalar() or 0
    
    # Count samples with status in_analysis
    pending_analysis = db.query(func.count(Sample.id)).filter(
        Sample.status == SampleStatus.in_analysis
    ).scalar() or 0
    
    return {
        "active_projects": active_projects,
        "total_samples": total_samples,
        "completed_this_month": completed_this_month,
        "pending_analysis": pending_analysis
    }
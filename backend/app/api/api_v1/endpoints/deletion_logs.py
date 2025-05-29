from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api import deps
from app.models import User, Sample, Project, SampleLog, ProjectLog
from app.models.sample import SampleStatus
from app.models.project import ProjectStatus
from app.schemas.deletion_log import DeletionLog

router = APIRouter()

@router.get("/", response_model=List[DeletionLog])
def get_deletion_logs(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    entity_type: str = Query(None, description="Filter by entity type (sample/project)"),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all deletion logs (admin only)"""
    # Check permissions
    from app.api.permissions import check_permission
    check_permission(current_user, "viewDeletionLogs")
    
    deletion_logs = []
    
    # Get sample deletions
    if not entity_type or entity_type == "sample":
        sample_logs = db.query(SampleLog).filter(
            SampleLog.log_type == "deletion"
        ).order_by(SampleLog.created_at.desc()).all()
        
        for log in sample_logs:
            sample = db.query(Sample).filter(Sample.id == log.sample_id).first()
            user = db.query(User).filter(User.id == log.user_id).first()
            
            if sample and user:
                # Extract deletion reason from comment
                reason = log.comment.replace("Sample deleted: ", "") if log.comment else "No reason provided"
                
                deletion_logs.append({
                    "id": log.id,
                    "entity_type": "sample",
                    "entity_id": sample.id,
                    "entity_identifier": sample.barcode,
                    "deletion_reason": reason,
                    "deleted_by": user.full_name,
                    "deleted_by_id": user.id,
                    "deleted_at": log.created_at,
                    "previous_status": log.old_value or "unknown"
                })
    
    # Get project deletions
    if not entity_type or entity_type == "project":
        project_logs = db.query(ProjectLog).filter(
            or_(
                ProjectLog.log_type == "deletion",
                ProjectLog.new_value == str(ProjectStatus.DELETED)
            )
        ).order_by(ProjectLog.created_at.desc()).all()
        
        for log in project_logs:
            project = db.query(Project).filter(Project.id == log.project_id).first()
            user = db.query(User).filter(User.id == log.user_id).first()
            
            if project and user:
                # Extract deletion reason from comment
                reason = log.comment if log.comment else "No reason provided"
                if "deleted:" in reason.lower():
                    reason = reason.split(":", 1)[1].strip()
                
                deletion_logs.append({
                    "id": log.id + 10000,  # Offset to avoid ID conflicts
                    "entity_type": "project",
                    "entity_id": project.id,
                    "entity_identifier": project.project_id,
                    "deletion_reason": reason,
                    "deleted_by": user.full_name,
                    "deleted_by_id": user.id,
                    "deleted_at": log.created_at,
                    "previous_status": log.old_value or "unknown"
                })
    
    # Sort by deletion date
    deletion_logs.sort(key=lambda x: x["deleted_at"], reverse=True)
    
    # Apply pagination
    start = skip
    end = skip + limit
    return deletion_logs[start:end]
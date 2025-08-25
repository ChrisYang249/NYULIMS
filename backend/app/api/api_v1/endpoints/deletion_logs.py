from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api import deps
from app.models import User, Sample, Project, SampleLog, ProjectLog, Product, ProductLog, Blocker, BlockerLog
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
            user = db.query(User).filter(User.id == log.created_by_id).first()
            
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
        # For projects, we look for deleted status in the projects table
        # and deletion logs in project_logs
        deleted_projects = db.query(Project).filter(
            Project.status == ProjectStatus.DELETED
        ).all()
        
        for project in deleted_projects:
            # Find the deletion log for this project
            deletion_log = db.query(ProjectLog).filter(
                ProjectLog.project_id == project.id,
                ProjectLog.log_type == "deletion"
            ).order_by(ProjectLog.created_at.desc()).first()
            
            if deletion_log:
                user = db.query(User).filter(User.id == deletion_log.created_by_id).first()
                if user:
                    # Extract deletion reason from comment
                    reason = deletion_log.comment if deletion_log.comment else "No reason provided"
                    if "deleted:" in reason.lower():
                        reason = reason.split(":", 1)[1].strip()
                    
                    deletion_logs.append({
                        "id": deletion_log.id + 10000,  # Offset to avoid ID conflicts
                        "entity_type": "project",
                        "entity_id": project.id,
                        "entity_identifier": project.project_id,
                        "deletion_reason": reason,
                        "deleted_by": user.full_name,
                        "deleted_by_id": user.id,
                        "deleted_at": deletion_log.created_at,
                        "previous_status": "unknown"  # ProjectLog doesn't track old_value
                    })
    
    # Get product deletions
    if not entity_type or entity_type == "product":
        product_logs = db.query(ProductLog).filter(
            ProductLog.log_type == "deletion"
        ).order_by(ProductLog.created_at.desc()).all()
        
        for log in product_logs:
            # Get the product name from the old_value JSON
            product_name = "Unknown Product"
            try:
                if log.old_value:
                    import json
                    old_data = json.loads(log.old_value)
                    product_name = old_data.get('name', 'Unknown Product')
            except:
                pass
            
            user = db.query(User).filter(User.id == log.created_by_id).first()
            
            if user:
                # Extract deletion reason from comment
                reason = log.comment.replace("Product deleted: ", "") if log.comment else "No reason provided"
                
                deletion_logs.append({
                    "id": log.id + 20000,  # Offset to avoid ID conflicts with samples/projects
                    "entity_type": "product",
                    "entity_id": log.product_id or 0,  # Use 0 if product_id is null
                    "entity_identifier": product_name,
                    "deletion_reason": reason,
                    "deleted_by": user.full_name,
                    "deleted_by_id": user.id,
                    "deleted_at": log.created_at,
                    "previous_status": "active"  # Products are active before deletion
                })
    
    # Get blocker deletions
    if not entity_type or entity_type == "blocker":
        blocker_logs = db.query(BlockerLog).filter(
            BlockerLog.log_type == "deletion"
        ).order_by(BlockerLog.created_at.desc()).all()
        
        for log in blocker_logs:
            # Get the blocker name from the old_value JSON
            blocker_name = "Unknown Blocker"
            try:
                if log.old_value:
                    import json
                    old_data = json.loads(log.old_value)
                    blocker_name = old_data.get('name', 'Unknown Blocker')
            except:
                pass
            
            user = db.query(User).filter(User.id == log.created_by_id).first()
            
            if user:
                # Extract deletion reason from comment
                reason = log.comment.replace("Blocker deleted: ", "") if log.comment else "No reason provided"
                
                deletion_logs.append({
                    "id": log.id + 30000,  # Offset to avoid ID conflicts with samples/projects/products
                    "entity_type": "blocker",
                    "entity_id": log.blocker_id or 0,  # Use 0 if blocker_id is null
                    "entity_identifier": blocker_name,
                    "deletion_reason": reason,
                    "deleted_by": user.full_name,
                    "deleted_by_id": user.id,
                    "deleted_at": log.created_at,
                    "previous_status": "active"  # Blockers are active before deletion
                })
    
    # Sort by deletion date
    deletion_logs.sort(key=lambda x: x["deleted_at"], reverse=True)
    
    # Apply pagination
    start = skip
    end = skip + limit
    return deletion_logs[start:end]
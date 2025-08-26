from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api import deps
from app.models.deletion_log import DeletionLog
from app.schemas.deletion_log import DeletionLog as DeletionLogSchema

router = APIRouter()

@router.get("/", response_model=List[DeletionLogSchema])
def get_deletion_logs(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    entity_type: Optional[str] = Query(None, description="Filter by entity type (sample/project)"),
):
    """Get all deletion logs (admin only)"""
    query = db.query(DeletionLog)
    
    if entity_type:
        query = query.filter(DeletionLog.entity_type == entity_type)
    
    logs = query.order_by(DeletionLog.deleted_at.desc()).offset(skip).limit(limit).all()
    return logs

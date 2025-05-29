from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import holidays
import os
import uuid
from pathlib import Path

from app.api import deps
from app.models import User, Project, Client, ProjectLog, Employee, ProjectAttachment
from app.models.project import ProjectStatus
from app.schemas.project import Project as ProjectSchema, ProjectCreate, ProjectUpdate, ProjectLog as ProjectLogSchema
from app.schemas.attachment import ProjectAttachment as AttachmentSchema

router = APIRouter()

# US holidays for due date calculation
us_holidays = holidays.US()

# Upload directory
UPLOAD_DIR = Path("uploads/projects")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def calculate_due_date(start_date: datetime, tat: str) -> datetime:
    """Calculate due date based on TAT, excluding weekends and holidays"""
    # Parse TAT to get number of days
    tat_map = {
        "DAYS_5_7": 7,
        "WEEKS_1_2": 14,
        "WEEKS_3_4": 28,
        "WEEKS_4_6": 42,
        "WEEKS_6_8": 56,
        "WEEKS_8_10": 70,
        "WEEKS_10_12": 84
    }
    
    days_to_add = tat_map.get(tat, 7)
    current_date = start_date.date()
    days_added = 0
    
    while days_added < days_to_add:
        current_date += timedelta(days=1)
        # Skip weekends and holidays
        if current_date.weekday() < 5 and current_date not in us_holidays:
            days_added += 1
    
    # Combine date with original time
    return datetime.combine(current_date, start_date.time())

def check_project_permission(user: User, action: str = "create") -> bool:
    """Check if user has permission for project actions"""
    allowed_roles = {
        "create": ["super_admin", "pm", "director"],
        "delete": ["super_admin", "director"]
    }
    return user.role in allowed_roles.get(action, [])

@router.get("/next-id", response_model=dict)
def get_next_project_id(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get the next available project ID"""
    # Check permissions
    if not check_project_permission(current_user, "create"):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create projects"
        )
    
    # Get the last project ID
    last_project = db.query(Project).filter(
        Project.project_id.like("CMBP%")
    ).order_by(Project.id.desc()).first()
    
    if last_project and last_project.project_id:
        last_number = int(last_project.project_id[4:])  # Remove "CMBP" prefix
        new_number = last_number + 1
    else:
        new_number = 1
    
    next_id = f"CMBP{new_number:05d}"
    return {"next_id": next_id}

@router.get("/", response_model=List[ProjectSchema])
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    include_deleted: bool = False,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve projects"""
    query = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.sales_rep)
    )
    
    # Filter out deleted projects by default
    if not include_deleted:
        query = query.filter(Project.status != ProjectStatus.DELETED)
    
    projects = query.offset(skip).limit(limit).all()
    return projects

@router.post("/", response_model=ProjectSchema)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new project"""
    # Check permissions
    if not check_project_permission(current_user, "create"):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create projects"
        )
    
    # Handle project ID - use provided or generate new one
    if project_in.project_id:
        # Check if provided project ID already exists
        existing = db.query(Project).filter(Project.project_id == project_in.project_id).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Project ID {project_in.project_id} already exists"
            )
        project_id = project_in.project_id
    else:
        # Generate project ID with CMBP prefix
        last_project = db.query(Project).filter(
            Project.project_id.like("CMBP%")
        ).order_by(Project.id.desc()).first()
        
        if last_project and last_project.project_id:
            last_number = int(last_project.project_id[4:])  # Remove "CMBP" prefix
            new_number = last_number + 1
        else:
            new_number = 1
        
        project_id = f"CMBP{new_number:05d}"
    
    # Calculate due date
    due_date = calculate_due_date(project_in.start_date, project_in.tat)
    
    # Create project
    project_data = project_in.dict()
    # Remove project_id and status if they exist in the input data
    project_data.pop('project_id', None)
    project_data.pop('status', None)  # Remove status to use default
    
    # Create project
    project = Project(
        project_id=project_id,
        due_date=due_date,
        created_by_id=current_user.id,
        **project_data
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Create initial log entry
    initial_log = ProjectLog(
        project_id=project.id,
        comment=f"Project created with ID {project_id}",
        log_type="creation",
        created_by_id=current_user.id
    )
    db.add(initial_log)
    db.commit()
    
    return project

@router.get("/{project_id}", response_model=ProjectSchema)
def read_project(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get project by ID"""
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.sales_rep),
        joinedload(Project.attachments)
    ).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.get("/{project_id}/logs", response_model=List[ProjectLogSchema])
def read_project_logs(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get project logs"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    logs = db.query(ProjectLog).filter(
        ProjectLog.project_id == project_id
    ).order_by(ProjectLog.created_at.desc()).all()
    
    return logs

@router.post("/{project_id}/logs", response_model=ProjectLogSchema)
def create_project_log(
    project_id: int,
    comment: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add a comment to project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    log = ProjectLog(
        project_id=project_id,
        comment=comment,
        log_type="comment",
        created_by_id=current_user.id
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    
    return log

@router.put("/{project_id}", response_model=ProjectSchema)
def update_project(
    project_id: int,
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update project"""
    # Check permissions
    if not check_project_permission(current_user, "create"):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to update projects"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_in.dict(exclude_unset=True)
    
    # If TAT is being updated, recalculate due date
    if "tat" in update_data or "start_date" in update_data:
        start_date = update_data.get("start_date", project.start_date)
        tat = update_data.get("tat", project.tat)
        update_data["due_date"] = calculate_due_date(start_date, tat)
    
    # Update the project
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Add log entry for the update
    log = ProjectLog(
        project_id=project_id,
        comment="Project details updated",
        log_type="update",
        created_by_id=current_user.id
    )
    db.add(log)
    db.commit()
    
    # Reload with relationships
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.sales_rep)
    ).filter(Project.id == project_id).first()
    
    return project

@router.post("/{project_id}/attachments", response_model=AttachmentSchema)
async def upload_attachment(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Upload attachment to project"""
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create attachment record
    attachment = ProjectAttachment(
        project_id=project_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=len(contents),
        file_type=file.content_type,
        uploaded_by_id=current_user.id
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    # Add log entry
    log = ProjectLog(
        project_id=project_id,
        comment=f"Attachment '{file.filename}' uploaded",
        log_type="attachment_upload",
        created_by_id=current_user.id
    )
    db.add(log)
    db.commit()
    
    return attachment

@router.get("/{project_id}/attachments", response_model=List[AttachmentSchema])
def get_attachments(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all attachments for a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    attachments = db.query(ProjectAttachment).filter(
        ProjectAttachment.project_id == project_id
    ).all()
    
    return attachments

@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Download an attachment"""
    attachment = db.query(ProjectAttachment).filter(
        ProjectAttachment.id == attachment_id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    if not os.path.exists(attachment.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=attachment.file_path,
        filename=attachment.original_filename,
        media_type=attachment.file_type or "application/octet-stream"
    )

@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Delete an attachment"""
    attachment = db.query(ProjectAttachment).filter(
        ProjectAttachment.id == attachment_id
    ).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)
    
    # Add log entry
    log = ProjectLog(
        project_id=attachment.project_id,
        comment=f"Attachment '{attachment.original_filename}' deleted",
        log_type="attachment_delete",
        created_by_id=current_user.id
    )
    db.add(log)
    
    # Delete database record
    db.delete(attachment)
    db.commit()
    
    return {"message": "Attachment deleted successfully"}

@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    reason: str = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Delete project (soft delete by changing status to cancelled)"""
    # Check if user has permission to delete
    if current_user.role not in ["super_admin", "pm", "director"]:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete projects"
        )
    
    # PMs must provide a reason
    if current_user.role == "pm" and not reason:
        raise HTTPException(
            status_code=400,
            detail="Project managers must provide a reason for deletion"
        )
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if project is already deleted
    if project.status == ProjectStatus.DELETED:
        raise HTTPException(
            status_code=400,
            detail="Project is already deleted"
        )
    
    # Soft delete by changing status
    project.status = ProjectStatus.DELETED
    
    # Create log entry
    log_comment = f"Project deleted"
    if reason:
        log_comment = f"Project deleted. Reason: {reason}"
    
    log = ProjectLog(
        project_id=project_id,
        comment=log_comment,
        log_type="deletion",
        created_by_id=current_user.id
    )
    db.add(log)
    
    db.commit()
    db.refresh(project)
    
    return {"message": "Project deleted successfully", "project_id": project.project_id}
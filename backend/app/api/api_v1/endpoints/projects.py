from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
import holidays
import os
import uuid
import json
from pathlib import Path

from app.api import deps
from app.models import User, Project, Client, ProjectLog, Employee, ProjectAttachment, ClientProjectConfig
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
    
    # Sort by created_at descending (newest first)
    query = query.order_by(Project.created_at.desc())
    
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
        # Get the highest numbered project ID (ignoring suffixes like -16S)
        projects = db.query(Project).filter(
            Project.project_id.like("CMBP%")
        ).all()
        
        max_number = 0
        for project in projects:
            if project.project_id and project.project_id.startswith("CMBP"):
                # Extract the numeric part (handle cases like CMBP00008-16S)
                numeric_part = project.project_id[4:]  # Remove "CMBP" prefix
                # Find the first non-digit character
                for i, char in enumerate(numeric_part):
                    if not char.isdigit():
                        numeric_part = numeric_part[:i]
                        break
                
                try:
                    number = int(numeric_part) if numeric_part else 0
                    max_number = max(max_number, number)
                except ValueError:
                    continue
        
        new_number = max_number + 1
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
    
    # If the project ID came from a client with custom naming, update their batch number
    client = db.query(Client).filter(Client.id == project.client_id).first()
    if client and client.use_custom_naming and project_in.project_id:
        # Check if this project ID follows the client's naming pattern
        config = db.query(ClientProjectConfig).filter(
            ClientProjectConfig.client_id == client.id
        ).first()
        
        if config and project_id.startswith(config.prefix):
            # Extract batch number from project_id
            prefix_len = len(config.prefix)
            batch_part = project_id[prefix_len:prefix_len+4]
            try:
                used_batch = int(batch_part)
                # Update last_batch_number if this one is higher
                if used_batch > config.last_batch_number:
                    config.last_batch_number = used_batch
                    db.commit()
            except ValueError:
                pass
    
    # Create detailed initial log entry
    client_name = client.name if client else "Unknown"
    log_details = [
        f"Project ID: {project_id}",
        f"Type: {project.project_type}",
        f"Client: {client_name}",
        f"Quoted Samples: {project.expected_sample_count}",
        f"TAT: {project.tat}",
        f"Due Date: {due_date.strftime('%Y-%m-%d')}"
    ]
    if project.sales_rep_id:
        sales_rep = db.query(Employee).filter(Employee.id == project.sales_rep_id).first()
        if sales_rep:
            log_details.append(f"Sales Rep: {sales_rep.name}")
    if project.project_value:
        log_details.append(f"Value: ${project.project_value:,.2f}")
    
    initial_log = ProjectLog(
        project_id=project.id,
        comment=f"Project created - " + "; ".join(log_details),
        log_type="creation",
        created_by_id=current_user.id
    )
    db.add(initial_log)
    db.commit()
    
    return project

@router.post("/with-attachments", response_model=ProjectSchema)
def create_project_with_attachments(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    project_data: str = Form(..., description="JSON string of project data"),
    quote_file: Optional[UploadFile] = File(None, description="Quote PDF file"),
    submission_form: Optional[UploadFile] = File(None, description="Submission form XLSX file"),
) -> Any:
    """Create new project with file attachments"""
    # Check permissions
    if not check_project_permission(current_user, "create"):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to create projects"
        )
    
    # Parse project data from JSON
    try:
        project_dict = json.loads(project_data)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid project data JSON"
        )
    
    # Validate file types
    if quote_file:
        if not quote_file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail="Quote file must be a PDF"
            )
        if quote_file.size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="Quote file size must be less than 10MB"
            )
    
    if submission_form:
        if not submission_form.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(
                status_code=400,
                detail="Submission form must be an Excel file (.xlsx or .xls)"
            )
        if submission_form.size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(
                status_code=400,
                detail="Submission form file size must be less than 10MB"
            )
    
    # Create ProjectCreate object from parsed data
    try:
        # Convert string dates to datetime objects
        if 'start_date' in project_dict:
            project_dict['start_date'] = datetime.fromisoformat(project_dict['start_date'].replace('Z', '+00:00'))
        
        project_in = ProjectCreate(**project_dict)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid project data: {str(e)}"
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
        projects = db.query(Project).filter(
            Project.project_id.like("CMBP%")
        ).all()
        
        max_number = 0
        for project in projects:
            if project.project_id and project.project_id.startswith("CMBP"):
                numeric_part = project.project_id[4:]
                for i, char in enumerate(numeric_part):
                    if not char.isdigit():
                        numeric_part = numeric_part[:i]
                        break
                
                try:
                    number = int(numeric_part) if numeric_part else 0
                    max_number = max(max_number, number)
                except ValueError:
                    continue
        
        new_number = max_number + 1
        project_id = f"CMBP{new_number:05d}"
    
    # Calculate due date
    due_date = calculate_due_date(project_in.start_date, project_in.tat)
    
    # Create project
    project_data_dict = project_in.dict()
    project_data_dict.pop('project_id', None)
    project_data_dict.pop('status', None)
    
    project = Project(
        project_id=project_id,
        due_date=due_date,
        created_by_id=current_user.id,
        **project_data_dict
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Handle file uploads
    uploaded_files = []
    
    if quote_file:
        # Save quote file
        file_extension = Path(quote_file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            content = quote_file.file.read()
            buffer.write(content)
        
        # Create attachment record
        attachment = ProjectAttachment(
            project_id=project.id,
            filename=unique_filename,  # Stored filename (with UUID)
            original_filename=quote_file.filename,  # Original filename
            file_path=str(file_path),
            file_size=len(content),
            file_type="quote",
            uploaded_by_id=current_user.id,
            created_by_id=current_user.id
        )
        db.add(attachment)
        uploaded_files.append(f"Quote: {quote_file.filename}")
    
    if submission_form:
        # Save submission form file
        file_extension = Path(submission_form.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        with open(file_path, "wb") as buffer:
            content = submission_form.file.read()
            buffer.write(content)
        
        # Create attachment record
        attachment = ProjectAttachment(
            project_id=project.id,
            filename=unique_filename,  # Stored filename (with UUID)
            original_filename=submission_form.filename,  # Original filename
            file_path=str(file_path),
            file_size=len(content),
            file_type="submission_form",
            uploaded_by_id=current_user.id,
            created_by_id=current_user.id
        )
        db.add(attachment)
        uploaded_files.append(f"Submission Form: {submission_form.filename}")
    
    db.commit()
    
    # Create initial log entry
    client = db.query(Client).filter(Client.id == project.client_id).first()
    client_name = client.name if client else "Unknown"
    log_details = [
        f"Project ID: {project_id}",
        f"Type: {project.project_type}",
        f"Client: {client_name}",
        f"Quoted Samples: {project.expected_sample_count}",
        f"TAT: {project.tat}",
        f"Due Date: {due_date.strftime('%Y-%m-%d')}"
    ]
    
    if uploaded_files:
        log_details.append(f"Attachments: {', '.join(uploaded_files)}")
    
    if project.sales_rep_id:
        sales_rep = db.query(Employee).filter(Employee.id == project.sales_rep_id).first()
        if sales_rep:
            log_details.append(f"Sales Rep: {sales_rep.name}")
    if project.project_value:
        log_details.append(f"Value: ${project.project_value:,.2f}")
    
    initial_log = ProjectLog(
        project_id=project.id,
        comment=f"Project created with attachments - " + "; ".join(log_details),
        log_type="creation",
        created_by_id=current_user.id
    )
    db.add(initial_log)
    db.commit()
    
    # Load project with relationships for response
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.sales_rep),
        joinedload(Project.attachments)
    ).filter(Project.id == project.id).first()
    
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
    
    logs = db.query(ProjectLog).options(
        joinedload(ProjectLog.created_by)
    ).filter(
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
    
    project = db.query(Project).options(
        joinedload(Project.client),
        joinedload(Project.sales_rep)
    ).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Store original values for comparison
    original_values = {}
    field_names = {
        "project_type": "Project Type",
        "client_id": "Client",
        "status": "Status",
        "tat": "TAT",
        "start_date": "Start Date",
        "expected_sample_count": "Quoted Sample Count",
        "processing_sample_count": "Processing Sample Count",
        "project_value": "Project Value",
        "notes": "Notes",
        "sales_rep_id": "Sales Rep"
    }
    
    update_data = project_in.dict(exclude_unset=True)
    changes = []
    
    # Track changes for each field
    for field, new_value in update_data.items():
        old_value = getattr(project, field)
        
        # Special handling for certain fields
        if field == "client_id" and old_value != new_value:
            old_client = project.client.name if project.client else "None"
            new_client = db.query(Client).filter(Client.id == new_value).first()
            new_client_name = new_client.name if new_client else "None"
            changes.append(f"{field_names.get(field, field)}: {old_client} → {new_client_name}")
        elif field == "sales_rep_id":
            old_rep = project.sales_rep.name if project.sales_rep else "None"
            if new_value:
                new_rep = db.query(Employee).filter(Employee.id == new_value).first()
                new_rep_name = new_rep.name if new_rep else "None"
            else:
                new_rep_name = "None"
            if old_rep != new_rep_name:
                changes.append(f"{field_names.get(field, field)}: {old_rep} → {new_rep_name}")
        elif field == "start_date":
            old_date = old_value.strftime("%Y-%m-%d") if old_value else "None"
            new_date = new_value.strftime("%Y-%m-%d") if new_value else "None"
            if old_date != new_date:
                changes.append(f"{field_names.get(field, field)}: {old_date} → {new_date}")
        elif field == "project_value":
            old_val = f"${old_value:,.2f}" if old_value else "None"
            new_val = f"${new_value:,.2f}" if new_value else "None"
            if old_val != new_val:
                changes.append(f"{field_names.get(field, field)}: {old_val} → {new_val}")
        elif field in ["status", "project_type", "tat"]:
            # For enums, compare the value
            if str(old_value) != str(new_value):
                changes.append(f"{field_names.get(field, field)}: {old_value} → {new_value}")
        elif old_value != new_value:
            # For other fields
            old_display = old_value if old_value is not None else "None"
            new_display = new_value if new_value is not None else "None"
            changes.append(f"{field_names.get(field, field)}: {old_display} → {new_display}")
    
    # If TAT is being updated, recalculate due date
    if "tat" in update_data or "start_date" in update_data:
        start_date = update_data.get("start_date", project.start_date)
        tat = update_data.get("tat", project.tat)
        update_data["due_date"] = calculate_due_date(start_date, tat)
        
        # Add due date change to log
        old_due = project.due_date.strftime("%Y-%m-%d") if project.due_date else "None"
        new_due = update_data["due_date"].strftime("%Y-%m-%d")
        if old_due != new_due:
            changes.append(f"Due Date: {old_due} → {new_due} (recalculated)")
    
    # Update the project
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Add detailed log entry for the update
    if changes:
        log_comment = "Updated: " + "; ".join(changes)
    else:
        log_comment = "Project updated (no changes detected)"
    
    log = ProjectLog(
        project_id=project_id,
        comment=log_comment,
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
    file_size_mb = len(contents) / (1024 * 1024)
    log = ProjectLog(
        project_id=project_id,
        comment=f"Attachment uploaded: '{file.filename}' ({file_size_mb:.2f} MB, {file.content_type or 'unknown type'})",
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
    file_size_mb = attachment.file_size / (1024 * 1024) if attachment.file_size else 0
    log = ProjectLog(
        project_id=attachment.project_id,
        comment=f"Attachment deleted: '{attachment.original_filename}' ({file_size_mb:.2f} MB)",
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
    
    # Create log entry before changing status
    old_status = project.status
    log_comment = f"Project {project.project_id} deleted (status changed from {old_status} to deleted)"
    if reason:
        log_comment += f". Reason: {reason}"
    
    # Soft delete by changing status
    project.status = ProjectStatus.DELETED
    
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
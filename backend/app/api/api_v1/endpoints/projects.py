from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User, Project, Client
from app.schemas.project import Project as ProjectSchema, ProjectCreate

router = APIRouter()

@router.get("/", response_model=List[ProjectSchema])
def read_projects(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve projects"""
    projects = db.query(Project).offset(skip).limit(limit).all()
    return projects

@router.post("/", response_model=ProjectSchema)
def create_project(
    *,
    db: Session = Depends(deps.get_db),
    project_in: ProjectCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new project"""
    # Generate project ID
    last_project = db.query(Project).order_by(Project.id.desc()).first()
    if last_project and last_project.project_id:
        last_number = int(last_project.project_id[2:])  # Remove "CP" prefix
        new_number = last_number + 1
    else:
        new_number = 1
    
    project_id = f"CP{new_number:05d}"
    
    # Create project
    project = Project(
        project_id=project_id,
        created_by_id=current_user.id,
        **project_in.dict()
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return project

@router.get("/{project_id}", response_model=ProjectSchema)
def read_project(
    project_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, update

from app.api import deps
from app.models import Client, ClientProjectConfig as ClientProjectConfigModel
from app.schemas.client_project_config import (
    ClientProjectConfig,
    ClientProjectConfigCreate,
    ClientProjectConfigUpdate,
    GenerateProjectIdRequest,
    GenerateProjectIdResponse
)

router = APIRouter()

@router.get("/", response_model=List[ClientProjectConfig])
def get_all_client_configs(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> List[ClientProjectConfig]:
    """Get all client project configurations"""
    configs = db.query(ClientProjectConfigModel).all()
    return configs

@router.get("/{client_id}", response_model=ClientProjectConfig)
def get_client_config(
    client_id: int,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> ClientProjectConfig:
    """Get project configuration for a specific client"""
    config = db.query(ClientProjectConfigModel).filter(
        ClientProjectConfigModel.client_id == client_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Client configuration not found")
    
    return config

@router.post("/", response_model=ClientProjectConfig)
def create_client_config(
    config_in: ClientProjectConfigCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> ClientProjectConfig:
    """Create project configuration for a client"""
    # Check if client exists
    client = db.query(Client).filter(Client.id == config_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check if config already exists for this client
    existing = db.query(ClientProjectConfigModel).filter(
        ClientProjectConfigModel.client_id == config_in.client_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Configuration already exists for this client")
    
    # Create new config
    config = ClientProjectConfigModel(
        **config_in.dict(),
        last_batch_number=0
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    
    return config

@router.put("/{client_id}", response_model=ClientProjectConfig)
def update_client_config(
    client_id: int,
    config_in: ClientProjectConfigUpdate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> ClientProjectConfig:
    """Update project configuration for a client"""
    config = db.query(ClientProjectConfigModel).filter(
        ClientProjectConfigModel.client_id == client_id
    ).first()
    
    if not config:
        raise HTTPException(status_code=404, detail="Client configuration not found")
    
    # Update only provided fields
    update_data = config_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    
    return config

@router.post("/generate-project-id", response_model=GenerateProjectIdResponse)
def generate_project_id(
    request: GenerateProjectIdRequest,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> GenerateProjectIdResponse:
    """Generate a project ID based on client configuration - PREVIEW ONLY"""
    # Get client config
    config = db.query(ClientProjectConfigModel).filter(
        ClientProjectConfigModel.client_id == request.client_id
    ).first()
    
    if not config:
        raise HTTPException(
            status_code=404, 
            detail="No project ID configuration found for this client. Please configure naming scheme first."
        )
    
    # Use next batch number (don't increment yet - this is just preview)
    next_batch_number = config.last_batch_number + 1
    
    # Generate project ID based on naming scheme
    project_id = config.prefix + str(next_batch_number).zfill(4)
    
    # Add sample type suffixes if configured
    if config.include_sample_types:
        suffixes = []
        if request.stool_count and request.stool_count > 0:
            suffixes.append(f"{request.stool_count}ST")
        if request.vaginal_count and request.vaginal_count > 0:
            suffixes.append(f"{request.vaginal_count}VG")
        if request.other_count and request.other_count > 0:
            suffixes.append(f"{request.other_count}OT")
        
        if suffixes:
            project_id += "_" + "_".join(suffixes)
    
    # Add custom suffix if provided
    if request.custom_suffix:
        project_id += "_" + request.custom_suffix
    
    # DON'T update the batch number here - only preview
    
    return GenerateProjectIdResponse(
        project_id=project_id,
        batch_number=next_batch_number
    )

@router.post("/check-project-id")
def check_project_id_exists(
    project_id: str,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> dict:
    """Check if a project ID already exists"""
    from app.models import Project
    
    exists = db.query(Project).filter(
        Project.project_id == project_id
    ).first() is not None
    
    return {"exists": exists, "project_id": project_id}

@router.post("/use-project-id/{client_id}")
def use_project_id(
    client_id: int,
    project_id: str,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
) -> dict:
    """Mark a project ID as used and increment the batch number"""
    config = db.query(ClientProjectConfigModel).filter(
        ClientProjectConfigModel.client_id == client_id
    ).first()
    
    if not config:
        return {"success": False, "message": "No configuration found"}
    
    # Extract batch number from project_id
    # Expected format: PREFIX#### or PREFIX####_suffixes
    prefix_len = len(config.prefix)
    if project_id.startswith(config.prefix):
        # Extract the batch number part
        batch_part = project_id[prefix_len:prefix_len+4]
        try:
            used_batch = int(batch_part)
            # Update last_batch_number if this one is higher
            if used_batch >= config.last_batch_number:
                config.last_batch_number = used_batch
                db.commit()
                return {"success": True, "message": f"Updated batch number to {used_batch}"}
        except ValueError:
            pass
    
    return {"success": False, "message": "Could not extract batch number"}
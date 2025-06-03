from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api import deps
from app.models import User, Client, ClientProjectConfig
from app.schemas.client import Client as ClientSchema, ClientCreate, ClientUpdate

router = APIRouter()


@router.get("/", response_model=List[ClientSchema])
def read_clients(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve clients.
    """
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients


@router.post("/", response_model=ClientSchema)
def create_client(
    *,
    db: Session = Depends(deps.get_db),
    client_in: ClientCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new client.
    """
    # Check if client with same email already exists
    existing_client = db.query(Client).filter(Client.email == client_in.email).first()
    if existing_client:
        raise HTTPException(
            status_code=400,
            detail="Client with this email already exists",
        )
    
    client = Client(
        **client_in.dict(),
        created_by_id=current_user.id
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    
    # If client uses custom naming and has an abbreviation, create a project config
    if client.use_custom_naming and client.abbreviation:
        project_config = ClientProjectConfig(
            client_id=client.id,
            naming_scheme=f"{client.abbreviation}{{batch#}}_{{#}}ST_{{#}}VG",
            prefix=client.abbreviation,
            last_batch_number=0,
            include_sample_types=True
        )
        db.add(project_config)
        db.commit()
    
    return client


@router.get("/{client_id}", response_model=ClientSchema)
def read_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get client by ID.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )
    return client


@router.put("/{client_id}", response_model=ClientSchema)
def update_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
    client_in: ClientUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Update a client.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found",
        )
    
    # Check if new email already exists (if email is being changed)
    if client_in.email and client_in.email != client.email:
        existing_client = db.query(Client).filter(
            Client.email == client_in.email,
            Client.id != client_id
        ).first()
        if existing_client:
            raise HTTPException(
                status_code=400,
                detail="Client with this email already exists",
            )
    
    # Check if client is being changed to use custom naming
    was_using_custom = client.use_custom_naming
    
    # Update client fields
    update_data = client_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    client.updated_by_id = current_user.id
    client.updated_at = func.now()
    db.add(client)
    db.commit()
    db.refresh(client)
    
    # If client is now using custom naming and has an abbreviation, create a project config
    if client.use_custom_naming and client.abbreviation and not was_using_custom:
        # Check if config already exists
        existing_config = db.query(ClientProjectConfig).filter(
            ClientProjectConfig.client_id == client.id
        ).first()
        
        if not existing_config:
            project_config = ClientProjectConfig(
                client_id=client.id,
                naming_scheme=f"{client.abbreviation}{{batch#}}_{{#}}ST_{{#}}VG",
                prefix=client.abbreviation,
                last_batch_number=0,
                include_sample_types=True
            )
            db.add(project_config)
            db.commit()
    
    return client
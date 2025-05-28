from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models import User, Client
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
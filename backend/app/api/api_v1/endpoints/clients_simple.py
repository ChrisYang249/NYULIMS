from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.api import deps
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, Client as ClientSchema

router = APIRouter()

@router.get("/", response_model=List[ClientSchema])
def read_clients(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    """Retrieve clients."""
    clients = db.query(Client).offset(skip).limit(limit).all()
    return clients

@router.post("/", response_model=ClientSchema)
def create_client(
    *,
    db: Session = Depends(deps.get_db),
    client_in: ClientCreate,
):
    """Create new client."""
    client = Client(**client_in.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.get("/{client_id}", response_model=ClientSchema)
def read_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
):
    """Get client by ID."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/{client_id}", response_model=ClientSchema)
def update_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
    client_in: ClientUpdate,
):
    """Update a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    for field, value in client_in.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    
    db.add(client)
    db.commit()
    db.refresh(client)
    return client

@router.delete("/{client_id}")
def delete_client(
    *,
    db: Session = Depends(deps.get_db),
    client_id: int,
):
    """Delete a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(client)
    db.commit()
    return {"message": "Client deleted successfully"}

from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import random

from app.api import deps
from app.models import User, Sample, SampleStatus
from app.schemas.sample import Sample as SampleSchema, SampleCreate

router = APIRouter()

def generate_barcode(db: Session, length: int = 6) -> str:
    """Generate unique barcode"""
    while True:
        barcode = ''.join([str(random.randint(0, 9)) for _ in range(length)])
        existing = db.query(Sample).filter(Sample.barcode == barcode).first()
        if not existing:
            return barcode

@router.get("/", response_model=List[SampleSchema])
def read_samples(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: int = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve samples"""
    query = db.query(Sample)
    if project_id:
        query = query.filter(Sample.project_id == project_id)
    samples = query.offset(skip).limit(limit).all()
    return samples

@router.post("/", response_model=SampleSchema)
def create_sample(
    *,
    db: Session = Depends(deps.get_db),
    sample_in: SampleCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new sample"""
    # Generate barcode
    barcode = generate_barcode(db)
    
    # Handle reprocessing
    if sample_in.parent_sample_id:
        parent = db.query(Sample).filter(Sample.id == sample_in.parent_sample_id).first()
        if parent:
            # Create reprocess barcode like 123456-R1
            reprocess_count = db.query(Sample).filter(
                Sample.parent_sample_id == parent.id
            ).count()
            barcode = f"{parent.barcode}-R{reprocess_count + 1}"
    
    sample = Sample(
        barcode=barcode,
        created_by_id=current_user.id,
        **sample_in.dict()
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    
    return sample

@router.patch("/{sample_id}/accession")
def accession_sample(
    sample_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Accession a sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    sample.status = SampleStatus.ACCESSIONED
    sample.accessioned_by_id = current_user.id
    sample.accessioned_date = func.now()
    
    db.commit()
    db.refresh(sample)
    
    return sample
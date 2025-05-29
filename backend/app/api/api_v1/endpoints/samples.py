from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
import random
from datetime import datetime

from app.api import deps
from app.models import (
    User, Sample, SampleStatus, SampleType, Project, StorageLocation,
    ExtractionResult, LibraryPrepResult, SequencingRunSample, SequencingRun,
    SampleLog
)
from app.models.user import User as UserModel
from app.models.sample_type import SampleType as SampleTypeModel
from app.schemas.sample import (
    Sample as SampleSchema, 
    SampleCreate, 
    SampleUpdate,
    SampleBulkCreate,
    SampleAccession,
    SampleFailure,
    SampleWithLabData,
    StorageLocation as StorageLocationSchema,
    StorageLocationCreate,
    SampleLog as SampleLogSchema,
    SampleLogCreate
)

router = APIRouter()

def generate_barcode(db: Session, length: int = 6) -> str:
    """Generate unique barcode"""
    while True:
        barcode = ''.join([str(random.randint(0, 9)) for _ in range(length)])
        existing = db.query(Sample).filter(Sample.barcode == barcode).first()
        if not existing:
            return barcode

def create_sample_log(
    db: Session,
    sample_id: int,
    comment: str,
    log_type: str = "comment",
    old_value: str = None,
    new_value: str = None,
    user_id: int = None
) -> SampleLog:
    """Create a log entry for a sample"""
    log = SampleLog(
        sample_id=sample_id,
        comment=comment,
        log_type=log_type,
        old_value=old_value,
        new_value=new_value,
        created_by_id=user_id
    )
    db.add(log)
    return log

@router.get("/", response_model=List[SampleWithLabData])
def read_samples(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    project_id: Optional[int] = Query(None),
    status: Optional[SampleStatus] = Query(None),
    sample_type: Optional[str] = Query(None),
    include_deleted: bool = Query(False, description="Include deleted samples"),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Retrieve samples with lab data"""
    query = db.query(Sample).options(
        joinedload(Sample.project).joinedload(Project.client),
        joinedload(Sample.storage_location),
        joinedload(Sample.sample_type_ref),
        joinedload(Sample.extraction_results),
        joinedload(Sample.library_prep_results),
        joinedload(Sample.sequencing_run_samples).joinedload(SequencingRunSample.sequencing_run)
    )
    
    # Filter out deleted samples by default
    if not include_deleted:
        query = query.filter(Sample.status != SampleStatus.DELETED)
    
    if project_id:
        query = query.filter(Sample.project_id == project_id)
    if status:
        query = query.filter(Sample.status == status)
    if sample_type:
        # Import SampleType model
        from app.models.sample_type import SampleType as SampleTypeModel
        # Filter by sample_type name from the relationship
        query = query.join(Sample.sample_type_ref).filter(
            SampleTypeModel.name == sample_type
        )
    
    samples = query.offset(skip).limit(limit).all()
    
    # Enhance with lab data
    result = []
    for sample in samples:
        sample_dict = {
            "id": sample.id,
            "barcode": sample.barcode,
            "client_sample_id": sample.client_sample_id,
            "project_id": sample.project_id,
            "sample_type": sample.sample_type_ref.name if sample.sample_type_ref else sample.sample_type,
            "sample_type_other": sample.sample_type_other,
            "status": sample.status,
            "target_depth": sample.target_depth,
            "well_location": sample.well_location,
            "due_date": sample.due_date,
            "created_at": sample.created_at,
            "received_date": sample.received_date,
            "accessioned_date": sample.accessioned_date,
            "storage_location": sample.storage_location,
            "storage_unit": sample.storage_unit,
            "storage_shelf": sample.storage_shelf,
            "storage_box": sample.storage_box,
            "storage_position": sample.storage_position,
            "project_name": sample.project.name if sample.project else None,
            "project_code": sample.project.project_id if sample.project else None,  # The CMBP ID
            "client_institution": sample.project.client.institution if sample.project and sample.project.client else None,
        }
        
        # Add extraction data
        if sample.extraction_results:
            latest_extraction = sorted(sample.extraction_results, key=lambda x: x.created_at)[-1]
            sample_dict["extraction_kit"] = latest_extraction.extraction_kit
            sample_dict["extraction_lot"] = latest_extraction.qubit_lot
            sample_dict["dna_concentration_ng_ul"] = latest_extraction.concentration_ng_ul
        
        # Add library prep data
        if sample.library_prep_results:
            latest_prep = sorted(sample.library_prep_results, key=lambda x: x.created_at)[-1]
            sample_dict["library_prep_kit"] = latest_prep.prep_kit
            sample_dict["library_prep_lot"] = None  # Add lot field to model if needed
            sample_dict["library_concentration_ng_ul"] = latest_prep.library_concentration_ng_ul
        
        # Add sequencing data
        if sample.sequencing_run_samples:
            latest_run = sorted(sample.sequencing_run_samples, key=lambda x: x.sequencing_run.created_at)[-1]
            sample_dict["sequencing_run_id"] = latest_run.sequencing_run.run_id
            sample_dict["sequencing_instrument"] = latest_run.sequencing_run.instrument_id
            sample_dict["achieved_depth"] = latest_run.yield_mb  # Or calculate from reads
        
        result.append(SampleWithLabData(**sample_dict))
    
    return result

@router.get("/{sample_id}", response_model=SampleWithLabData)
def read_sample(
    sample_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get sample by ID"""
    sample = db.query(Sample).options(
        joinedload(Sample.project).joinedload(Project.client),
        joinedload(Sample.storage_location),
        joinedload(Sample.sample_type_ref),
        joinedload(Sample.extraction_results),
        joinedload(Sample.library_prep_results),
        joinedload(Sample.sequencing_run_samples).joinedload(SequencingRunSample.sequencing_run)
    ).filter(Sample.id == sample_id).first()
    
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Build response with lab data (similar to above)
    sample_dict = {
        "id": sample.id,
        "barcode": sample.barcode,
        "client_sample_id": sample.client_sample_id,
        "project_id": sample.project_id,
        "sample_type": sample.sample_type_ref.name if sample.sample_type_ref else sample.sample_type,
        "sample_type_other": sample.sample_type_other,
        "status": sample.status,
        "target_depth": sample.target_depth,
        "well_location": sample.well_location,
        "due_date": sample.due_date,
        "created_at": sample.created_at,
        "received_date": sample.received_date,
        "accessioned_date": sample.accessioned_date,
        "storage_location": sample.storage_location,
        "storage_unit": sample.storage_unit,
        "storage_shelf": sample.storage_shelf,
        "storage_box": sample.storage_box,
        "storage_position": sample.storage_position,
        "project_name": sample.project.name if sample.project else None,
        "project_code": sample.project.project_id if sample.project else None,  # The CMBP ID
        "client_institution": sample.project.client.institution if sample.project and sample.project.client else None,
    }
    
    # Add lab data (same logic as list endpoint)
    if sample.extraction_results:
        latest_extraction = sorted(sample.extraction_results, key=lambda x: x.created_at)[-1]
        sample_dict["extraction_kit"] = latest_extraction.extraction_kit
        sample_dict["extraction_lot"] = latest_extraction.qubit_lot
        sample_dict["dna_concentration_ng_ul"] = latest_extraction.concentration_ng_ul
    
    if sample.library_prep_results:
        latest_prep = sorted(sample.library_prep_results, key=lambda x: x.created_at)[-1]
        sample_dict["library_prep_kit"] = latest_prep.prep_kit
        sample_dict["library_concentration_ng_ul"] = latest_prep.library_concentration_ng_ul
    
    if sample.sequencing_run_samples:
        latest_run = sorted(sample.sequencing_run_samples, key=lambda x: x.sequencing_run.created_at)[-1]
        sample_dict["sequencing_run_id"] = latest_run.sequencing_run.run_id
        sample_dict["sequencing_instrument"] = latest_run.sequencing_run.instrument_id
        sample_dict["achieved_depth"] = latest_run.yield_mb
    
    return SampleWithLabData(**sample_dict)

@router.post("/", response_model=SampleSchema)
def create_sample(
    *,
    db: Session = Depends(deps.get_db),
    sample_in: SampleCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new sample"""
    # Import SampleType model to avoid circular import
    from app.models.sample_type import SampleType as SampleTypeModel
    
    # Get project to inherit due date
    project = db.query(Project).filter(Project.id == sample_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get sample type to map enum value
    sample_type_obj = db.query(SampleTypeModel).filter(
        SampleTypeModel.id == sample_in.sample_type_id
    ).first()
    if not sample_type_obj:
        raise HTTPException(status_code=404, detail="Sample type not found")
    
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
    
    sample_data = sample_in.dict()
    # Set due date from project if not provided
    if not sample_data.get('due_date'):
        sample_data['due_date'] = project.due_date
    
    # Don't set sample_type - we'll use sample_type_id going forward
    if 'sample_type' in sample_data:
        del sample_data['sample_type']
    
    sample = Sample(
        barcode=barcode,
        created_by_id=current_user.id,
        **sample_data
    )
    db.add(sample)
    db.flush()  # Get the ID without committing
    
    # Create log entry
    create_sample_log(
        db=db,
        sample_id=sample.id,
        comment=f"Sample created with barcode {barcode}",
        log_type="creation",
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(sample)
    
    return sample

@router.post("/bulk", response_model=List[SampleSchema])
def create_samples_bulk(
    *,
    db: Session = Depends(deps.get_db),
    bulk_in: SampleBulkCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create multiple samples at once"""
    # Import SampleType model to avoid circular import
    from app.models.sample_type import SampleType as SampleTypeModel
    
    # Validate project
    project = db.query(Project).filter(Project.id == bulk_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get sample type to map enum value
    if not bulk_in.sample_type_id:
        raise HTTPException(status_code=400, detail="sample_type_id is required")
        
    sample_type_obj = db.query(SampleTypeModel).filter(
        SampleTypeModel.id == bulk_in.sample_type_id
    ).first()
    if not sample_type_obj:
        raise HTTPException(status_code=404, detail="Sample type not found")
    
    # Map to enum for backward compatibility
    sample_type_enum = sample_type_obj.name
    
    # Pre-generate barcodes
    barcodes = []
    for i in range(bulk_in.count):
        barcodes.append(generate_barcode(db))
    
    # Create samples
    samples = []
    for i, barcode in enumerate(barcodes):
        sample_data = bulk_in.samples[i] if i < len(bulk_in.samples) else {}
        
        # Validate well location for DNA plates
        if sample_type_obj.name == 'dna_plate' and not sample_data.get('well_location'):
            raise HTTPException(
                status_code=400, 
                detail=f"Well location required for DNA plate sample {i+1}"
            )
        
        sample = Sample(
            barcode=barcode,
            project_id=bulk_in.project_id,
            sample_type_id=bulk_in.sample_type_id,
            client_sample_id=sample_data.get('client_sample_id'),
            target_depth=sample_data.get('target_depth'),
            well_location=sample_data.get('well_location'),
            storage_location_id=sample_data.get('storage_location_id'),
            due_date=sample_data.get('due_date', project.due_date),
            created_by_id=current_user.id,
            status=SampleStatus.REGISTERED
        )
        samples.append(sample)
    
    db.add_all(samples)
    db.commit()
    
    for sample in samples:
        db.refresh(sample)
        # Create log entry
        create_sample_log(
            db=db,
            sample_id=sample.id,
            comment=f"Sample created with barcode {sample.barcode}",
            log_type="creation",
            user_id=current_user.id
        )
    
    db.commit()
    
    return samples

@router.put("/{sample_id}", response_model=SampleSchema)
def update_sample(
    sample_id: int,
    sample_in: SampleUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    update_data = sample_in.dict(exclude_unset=True)
    
    # Track changes for logging
    changes = []
    for field, new_value in update_data.items():
        old_value = getattr(sample, field)
        if old_value != new_value:
            changes.append({
                'field': field,
                'old': str(old_value) if old_value is not None else None,
                'new': str(new_value) if new_value is not None else None
            })
            setattr(sample, field, new_value)
    
    if changes:
        # Log each change
        for change in changes:
            if change['field'] == 'status':
                create_sample_log(
                    db=db,
                    sample_id=sample.id,
                    comment=f"Status changed from {change['old']} to {change['new']}",
                    log_type="status_change",
                    old_value=change['old'],
                    new_value=change['new'],
                    user_id=current_user.id
                )
            else:
                create_sample_log(
                    db=db,
                    sample_id=sample.id,
                    comment=f"{change['field'].replace('_', ' ').title()} updated",
                    log_type="update",
                    old_value=change['old'],
                    new_value=change['new'],
                    user_id=current_user.id
                )
    
    sample.updated_by_id = current_user.id
    sample.updated_at = func.now()
    
    db.commit()
    db.refresh(sample)
    
    return sample

@router.patch("/{sample_id}/accession", response_model=SampleSchema)
def accession_sample(
    sample_id: int,
    accession_in: SampleAccession,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Accession a sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    old_status = sample.status
    sample.status = SampleStatus.ACCESSIONED
    sample.accessioned_by_id = current_user.id
    sample.accessioned_date = func.now()
    sample.received_date = func.now()
    
    if accession_in.accessioning_notes:
        sample.accessioning_notes = accession_in.accessioning_notes
    
    # Create log entry
    create_sample_log(
        db=db,
        sample_id=sample.id,
        comment=f"Sample accessioned{' - ' + accession_in.accessioning_notes if accession_in.accessioning_notes else ''}",
        log_type="accession",
        old_value=str(old_status),
        new_value=str(SampleStatus.ACCESSIONED),
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(sample)
    
    return sample

@router.post("/accession/bulk", response_model=List[SampleSchema])
def accession_samples_bulk(
    sample_ids: List[int],
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Accession multiple samples"""
    samples = db.query(Sample).filter(Sample.id.in_(sample_ids)).all()
    
    if len(samples) != len(sample_ids):
        raise HTTPException(status_code=404, detail="Some samples not found")
    
    for sample in samples:
        sample.status = SampleStatus.ACCESSIONED
        sample.accessioned_by_id = current_user.id
        sample.accessioned_date = func.now()
        sample.received_date = func.now()
    
    db.commit()
    
    for sample in samples:
        db.refresh(sample)
    
    return samples

# Storage location endpoints
@router.get("/storage/locations", response_model=List[StorageLocationSchema])
def read_storage_locations(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    freezer: Optional[str] = Query(None),
    available_only: bool = Query(True),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get storage locations"""
    query = db.query(StorageLocation)
    
    if freezer:
        query = query.filter(StorageLocation.freezer == freezer)
    if available_only:
        query = query.filter(StorageLocation.is_available == True)
    
    locations = query.offset(skip).limit(limit).all()
    return locations

@router.post("/storage/locations", response_model=StorageLocationSchema)
def create_storage_location(
    *,
    db: Session = Depends(deps.get_db),
    location_in: StorageLocationCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create storage location"""
    # Check if location already exists
    existing = db.query(StorageLocation).filter(
        and_(
            StorageLocation.freezer == location_in.freezer,
            StorageLocation.shelf == location_in.shelf,
            StorageLocation.box == location_in.box,
            StorageLocation.position == location_in.position
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Storage location already exists")
    
    location = StorageLocation(**location_in.dict())
    db.add(location)
    db.commit()
    db.refresh(location)
    
    return location

# Sample Log endpoints
@router.get("/{sample_id}/logs", response_model=List[SampleLogSchema])
def read_sample_logs(
    sample_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get all logs for a sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    logs = db.query(SampleLog).options(
        joinedload(SampleLog.created_by)
    ).filter(
        SampleLog.sample_id == sample_id
    ).order_by(SampleLog.created_at.desc()).all()
    
    # Convert to schema with user info
    result = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "sample_id": log.sample_id,
            "comment": log.comment,
            "log_type": log.log_type,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "created_at": log.created_at,
            "created_by_id": log.created_by_id,
            "created_by": {
                "id": log.created_by.id,
                "full_name": log.created_by.full_name,
                "username": log.created_by.username
            } if log.created_by else None
        }
        result.append(log_dict)
    
    return result

@router.post("/{sample_id}/logs", response_model=SampleLogSchema)
def create_sample_comment(
    sample_id: int,
    comment: str = Query(..., description="Comment text"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add a comment to a sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    log = create_sample_log(
        db=db,
        sample_id=sample_id,
        comment=comment,
        log_type="comment",
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(log)
    
    # Return with user info
    return {
        "id": log.id,
        "sample_id": log.sample_id,
        "comment": log.comment,
        "log_type": log.log_type,
        "old_value": log.old_value,
        "new_value": log.new_value,
        "created_at": log.created_at,
        "created_by_id": log.created_by_id,
        "created_by": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "username": current_user.username
        }
    }

@router.post("/{sample_id}/fail", response_model=SampleSchema)
def fail_sample(
    sample_id: int,
    failure_in: SampleFailure,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Mark a sample as failed and optionally create a reprocess sample"""
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    # Update the original sample
    old_status = sample.status
    sample.status = SampleStatus.FAILED
    sample.failed_stage = failure_in.failed_stage
    sample.failure_reason = failure_in.failure_reason
    
    # Log the failure
    create_sample_log(
        db=db,
        sample_id=sample.id,
        comment=f"Sample failed at {failure_in.failed_stage}: {failure_in.failure_reason}",
        log_type="status_change",
        old_value=str(old_status),
        new_value=str(SampleStatus.FAILED),
        user_id=current_user.id
    )
    
    # Create reprocess sample if requested
    if failure_in.create_reprocess:
        # Determine suffix based on stage and count
        stage_map = {
            "extraction": "E",
            "library_prep": "P",
            "sequencing": "S"
        }
        
        # Count existing reprocess samples
        reprocess_count = db.query(Sample).filter(
            Sample.parent_sample_id == sample.id,
            Sample.barcode.like(f"{sample.barcode}-{stage_map.get(failure_in.failed_stage, 'R')}%")
        ).count()
        
        new_barcode = f"{sample.barcode}-{stage_map.get(failure_in.failed_stage, 'R')}{reprocess_count + 2}"
        
        # Create new sample with same properties
        reprocess_sample = Sample(
            barcode=new_barcode,
            client_sample_id=sample.client_sample_id,
            project_id=sample.project_id,
            sample_type=sample.sample_type,
            parent_sample_id=sample.id,
            reprocess_type=failure_in.failed_stage,
            reprocess_reason=failure_in.failure_reason,
            reprocess_count=reprocess_count + 1,
            target_depth=sample.target_depth,
            well_location=sample.well_location,
            storage_location_id=sample.storage_location_id,
            due_date=sample.due_date,
            created_by_id=current_user.id,
            status=SampleStatus.REGISTERED,
            queue_priority=sample.queue_priority + 10  # Higher priority for reprocess
        )
        
        db.add(reprocess_sample)
        db.flush()
        
        # Log the reprocess creation
        create_sample_log(
            db=db,
            sample_id=reprocess_sample.id,
            comment=f"Reprocess sample created due to {failure_in.failed_stage} failure",
            log_type="creation",
            user_id=current_user.id
        )
    
    db.commit()
    db.refresh(sample)
    
    return sample

@router.get("/queues/{queue_name}", response_model=List[SampleWithLabData])
def get_queue_samples(
    queue_name: str,
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get samples in a specific queue"""
    # Map queue names to status filters
    queue_map = {
        "accessioning": [SampleStatus.RECEIVED],
        "extraction": [SampleStatus.ACCESSIONED],
        "extraction_active": [SampleStatus.IN_EXTRACTION],
        "library_prep": [SampleStatus.EXTRACTED],
        "library_prep_active": [SampleStatus.IN_LIBRARY_PREP],
        "sequencing": [SampleStatus.LIBRARY_PREPPED],
        "sequencing_active": [SampleStatus.IN_SEQUENCING],
        "reprocess": None  # Special handling for failed samples
    }
    
    if queue_name not in queue_map:
        raise HTTPException(status_code=400, detail=f"Invalid queue name: {queue_name}")
    
    query = db.query(Sample).options(
        joinedload(Sample.project).joinedload(Project.client),
        joinedload(Sample.storage_location),
        joinedload(Sample.extraction_results),
        joinedload(Sample.library_prep_results),
        joinedload(Sample.sequencing_run_samples).joinedload(SequencingRunSample.sequencing_run)
    )
    
    if queue_name == "reprocess":
        # Get failed samples that need reprocessing
        query = query.filter(Sample.failed_stage.isnot(None))
    else:
        statuses = queue_map[queue_name]
        if statuses:
            query = query.filter(Sample.status.in_(statuses))
    
    # Order by priority and created date
    query = query.order_by(Sample.queue_priority.desc(), Sample.created_at)
    
    samples = query.offset(skip).limit(limit).all()
    
    # Convert to SampleWithLabData (same logic as read_samples)
    result = []
    for sample in samples:
        sample_dict = {
            "id": sample.id,
            "barcode": sample.barcode,
            "client_sample_id": sample.client_sample_id,
            "project_id": sample.project_id,
            "sample_type": sample.sample_type,
            "status": sample.status,
            "target_depth": sample.target_depth,
            "well_location": sample.well_location,
            "due_date": sample.due_date,
            "created_at": sample.created_at,
            "received_date": sample.received_date,
            "accessioned_date": sample.accessioned_date,
            "storage_location": sample.storage_location,
            "queue_priority": sample.queue_priority,
            "queue_notes": sample.queue_notes,
            "failed_stage": sample.failed_stage,
            "failure_reason": sample.failure_reason,
            "reprocess_count": sample.reprocess_count,
            "batch_id": sample.batch_id,
            "extraction_due_date": sample.extraction_due_date,
            "library_prep_due_date": sample.library_prep_due_date,
            "sequencing_due_date": sample.sequencing_due_date,
            "project_name": sample.project.name if sample.project else None,
            "project_code": sample.project.project_id if sample.project else None,
            "client_institution": sample.project.client.institution if sample.project and sample.project.client else None,
        }
        
        # Add lab data (same as before)
        if sample.extraction_results:
            latest_extraction = sorted(sample.extraction_results, key=lambda x: x.created_at)[-1]
            sample_dict["extraction_kit"] = latest_extraction.extraction_kit
            sample_dict["dna_concentration_ng_ul"] = latest_extraction.concentration_ng_ul
        
        if sample.library_prep_results:
            latest_prep = sorted(sample.library_prep_results, key=lambda x: x.created_at)[-1]
            sample_dict["library_prep_kit"] = latest_prep.prep_kit
            sample_dict["library_concentration_ng_ul"] = latest_prep.library_concentration_ng_ul
        
        if sample.sequencing_run_samples:
            latest_run = sorted(sample.sequencing_run_samples, key=lambda x: x.sequencing_run.created_at)[-1]
            sample_dict["sequencing_run_id"] = latest_run.sequencing_run.run_id
            sample_dict["sequencing_instrument"] = latest_run.sequencing_run.instrument_id
            sample_dict["achieved_depth"] = latest_run.yield_mb
        
        result.append(SampleWithLabData(**sample_dict))
    
    return result

@router.delete("/{sample_id}")
def delete_sample(
    sample_id: int,
    deletion_reason: str = Query(..., description="Reason for deletion"),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Soft delete a sample (mark as deleted)"""
    # Check permissions
    from app.api.permissions import check_permission
    check_permission(current_user, "deleteSamples")
    
    sample = db.query(Sample).filter(Sample.id == sample_id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    
    if sample.status == SampleStatus.DELETED:
        raise HTTPException(status_code=400, detail="Sample is already deleted")
    
    # Update status to deleted
    old_status = sample.status
    sample.status = SampleStatus.DELETED
    
    # Create deletion log entry
    create_sample_log(
        db=db,
        sample_id=sample.id,
        comment=f"Sample deleted: {deletion_reason}",
        log_type="deletion",
        old_value=str(old_status),
        new_value=str(SampleStatus.DELETED),
        user_id=current_user.id
    )
    
    db.commit()
    db.refresh(sample)
    
    return {"message": "Sample marked as deleted"}
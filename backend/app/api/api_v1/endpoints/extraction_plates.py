from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from datetime import datetime
import random
import string

from app.api import deps
from app.models import (
    User, Sample, SampleStatus, Project, 
    ExtractionPlate, PlateStatus, PlateWellAssignment
)
from app.schemas.extraction_plate import (
    ExtractionPlate as ExtractionPlateSchema,
    ExtractionPlateCreate,
    ExtractionPlateUpdate,
    PlateAssignment,
    PlateWellAssignment as WellAssignmentSchema,
    PlateAutoAssignRequest,
    PlateAutoAssignResponse
)

router = APIRouter()

def generate_plate_id() -> str:
    """Generate unique plate ID"""
    date_str = datetime.now().strftime("%y%m%d")  # 2-digit year
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"EXT-{date_str}-{random_str}"

def get_well_position(index: int) -> tuple[str, int]:
    """Convert index (0-95) to well position (A1-H12)"""
    # Skip control wells: G11, G12, H11, H12
    control_wells = ["G11", "G12", "H11", "H12"]
    
    row = index // 12
    col = index % 12 + 1
    well = f"{chr(65 + row)}{col}"
    
    # If this is a control well, skip to next available
    if well in control_wells:
        return get_well_position(index + 1)
    
    return well, col

@router.get("/", response_model=List[ExtractionPlateSchema])
def get_extraction_plates(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    status: Optional[PlateStatus] = None,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get extraction plates"""
    query = db.query(ExtractionPlate).options(
        joinedload(ExtractionPlate.assigned_tech),
        joinedload(ExtractionPlate.samples)
    )
    
    if status:
        query = query.filter(ExtractionPlate.status == status)
    
    plates = query.offset(skip).limit(limit).all()
    
    # Convert to response model
    return [ExtractionPlateSchema.from_orm(plate) for plate in plates]

@router.get("/{plate_id}", response_model=ExtractionPlateSchema)
def get_extraction_plate(
    plate_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get single extraction plate"""
    plate = db.query(ExtractionPlate).options(
        joinedload(ExtractionPlate.assigned_tech),
        joinedload(ExtractionPlate.samples)
    ).filter(ExtractionPlate.id == plate_id).first()
    
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    return ExtractionPlateSchema.from_orm(plate)

@router.post("/", response_model=ExtractionPlateSchema)
def create_extraction_plate(
    *,
    db: Session = Depends(deps.get_db),
    plate_in: ExtractionPlateCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new extraction plate"""
    # Check if user is lab manager
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only lab managers can create extraction plates"
        )
    
    plate = ExtractionPlate(
        plate_id=generate_plate_id(),
        plate_name=plate_in.plate_name,
        extraction_method=plate_in.extraction_method,
        lysis_method=plate_in.lysis_method,
        extraction_lot=plate_in.extraction_lot,
        notes=plate_in.notes,
        assigned_tech_id=plate_in.assigned_tech_id,
        assigned_date=datetime.utcnow() if plate_in.assigned_tech_id else None,
        status=PlateStatus.PLANNING
    )
    
    db.add(plate)
    db.commit()
    db.refresh(plate)
    
    # Load relationships
    db.refresh(plate)
    
    return ExtractionPlateSchema.from_orm(plate)

@router.post("/{plate_id}/assign-samples", response_model=PlateAutoAssignResponse)
def auto_assign_samples_to_plate(
    *,
    db: Session = Depends(deps.get_db),
    plate_id: int,
    request: PlateAutoAssignRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Auto-assign samples to extraction plate based on criteria"""
    # Check if user is lab manager
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only lab managers can assign samples to plates"
        )
    
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.PLANNING:
        raise HTTPException(
            status_code=400,
            detail="Can only assign samples to plates in planning status"
        )
    
    # Get available samples from extraction queue
    query = db.query(Sample).filter(
        Sample.status == SampleStatus.EXTRACTION_QUEUE,
        Sample.extraction_plate_ref_id.is_(None)  # Not already assigned
    ).options(
        joinedload(Sample.project)
    )
    
    # Apply filters
    if request.project_ids:
        query = query.filter(Sample.project_id.in_(request.project_ids))
    
    if request.sample_types:
        query = query.filter(Sample.sample_type.in_(request.sample_types))
    
    # Order by priority: due date, then project to maximize grouping
    query = query.order_by(
        Sample.due_date.nullslast(),
        Sample.project_id
    )
    
    available_samples = query.limit(request.max_samples or 92).all()
    
    if len(available_samples) < (request.min_samples or 1):
        raise HTTPException(
            status_code=400,
            detail=f"Not enough samples available. Found {len(available_samples)}, need at least {request.min_samples or 1}"
        )
    
    # Assign samples to wells
    assigned_samples = []
    well_assignments = []
    
    for i, sample in enumerate(available_samples[:92]):  # Max 92 samples
        well_position, _ = get_well_position(i)
        
        # Update sample
        sample.extraction_plate_ref_id = plate.id
        sample.extraction_plate_id = plate.plate_id
        sample.extraction_well_position = well_position
        sample.extraction_tech_id = plate.assigned_tech_id
        sample.extraction_assigned_date = datetime.utcnow()
        sample.extraction_method = plate.extraction_method
        # Keep status as extraction_queue until plate is started
        # sample.status remains as SampleStatus.EXTRACTION_QUEUE
        
        # Create well assignment
        well_assignment = PlateWellAssignment(
            plate_id=plate.id,
            sample_id=sample.id,
            well_position=well_position,
            well_row=well_position[0],
            well_column=int(well_position[1:])
        )
        db.add(well_assignment)
        well_assignments.append(well_assignment)
        
        assigned_samples.append({
            "sample_id": sample.id,
            "barcode": sample.barcode,
            "well_position": well_position,
            "project_id": sample.project.project_id if sample.project else None
        })
    
    # Update plate status
    plate.status = PlateStatus.READY
    
    # Add control well assignments
    control_wells = [
        ("H11", "ext_pos", f"POS-{plate.plate_id}"),
        ("H12", "ext_neg", f"NEG-{plate.plate_id}")
    ]
    
    for well, ctrl_type, ctrl_id in control_wells:
        well_assignment = PlateWellAssignment(
            plate_id=plate.id,
            sample_id=None,  # No sample for controls
            well_position=well,
            well_row=well[0],
            well_column=int(well[1:]),
            is_control=True,
            control_type=ctrl_type
        )
        db.add(well_assignment)
        
        # Update plate control IDs
        if ctrl_type == "ext_pos":
            plate.ext_pos_ctrl_id = ctrl_id
        elif ctrl_type == "ext_neg":
            plate.ext_neg_ctrl_id = ctrl_id
    
    db.commit()
    
    # Get project summary
    project_counts = {}
    for sample in available_samples[:92]:
        if sample.project:
            project_id = sample.project.project_id
            project_counts[project_id] = project_counts.get(project_id, 0) + 1
    
    return PlateAutoAssignResponse(
        plate_id=plate.plate_id,
        total_samples=len(assigned_samples),
        assigned_samples=assigned_samples,
        project_summary=project_counts,
        control_wells={
            "extraction_positive": "H11",
            "extraction_negative": "H12",
            "library_prep_positive": "G11 (reserved)",
            "library_prep_negative": "G12 (reserved)"
        }
    )

@router.get("/{plate_id}/layout", response_model=List[WellAssignmentSchema])
def get_plate_layout(
    plate_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get plate layout with all well assignments"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    assignments = db.query(PlateWellAssignment).filter(
        PlateWellAssignment.plate_id == plate_id
    ).options(
        joinedload(PlateWellAssignment.sample).joinedload(Sample.project)
    ).order_by(
        PlateWellAssignment.well_row,
        PlateWellAssignment.well_column
    ).all()
    
    # Convert to response model using from_orm
    return [WellAssignmentSchema.from_orm(assignment) for assignment in assignments]

@router.put("/{plate_id}/start", response_model=ExtractionPlateSchema)
def start_extraction(
    plate_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Start extraction process for a plate"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.READY:
        raise HTTPException(
            status_code=400,
            detail="Can only start extraction for plates in ready status"
        )
    
    # Update plate status
    plate.status = PlateStatus.IN_PROGRESS
    plate.started_date = datetime.utcnow()
    
    # Update all samples on the plate
    samples = db.query(Sample).filter(
        Sample.extraction_plate_ref_id == plate.id
    ).all()
    
    for sample in samples:
        sample.status = SampleStatus.IN_EXTRACTION
        sample.extraction_started_date = datetime.utcnow()
    
    db.commit()
    db.refresh(plate)
    
    return ExtractionPlateSchema.from_orm(plate)

@router.put("/{plate_id}/complete", response_model=ExtractionPlateSchema)
def complete_extraction(
    *,
    db: Session = Depends(deps.get_db),
    plate_id: int,
    qc_data: dict,  # Will contain concentration data for each well
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Complete extraction process for a plate"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=400,
            detail="Can only complete extraction for plates in progress"
        )
    
    # Update plate status
    plate.status = PlateStatus.COMPLETED
    plate.completed_date = datetime.utcnow()
    
    # Update control QC data if provided
    if "H11" in qc_data:
        plate.ext_pos_ctrl_concentration = qc_data["H11"].get("concentration")
        plate.ext_pos_ctrl_pass = qc_data["H11"].get("pass", True)
    
    if "H12" in qc_data:
        plate.ext_neg_ctrl_concentration = qc_data["H12"].get("concentration")
        plate.ext_neg_ctrl_pass = qc_data["H12"].get("pass", True)
    
    # Update all samples on the plate
    samples = db.query(Sample).filter(
        Sample.extraction_plate_ref_id == plate.id
    ).all()
    
    for sample in samples:
        well = sample.extraction_well_position
        if well in qc_data:
            sample.extraction_concentration = qc_data[well].get("concentration")
            sample.extraction_volume = qc_data[well].get("volume", 50)  # Default 50ul
            sample.extraction_260_280 = qc_data[well].get("ratio_260_280")
            sample.extraction_260_230 = qc_data[well].get("ratio_260_230")
            sample.extraction_qc_pass = qc_data[well].get("pass", True)
        
        sample.status = SampleStatus.EXTRACTED
        sample.extraction_completed_date = datetime.utcnow()
    
    db.commit()
    db.refresh(plate)
    
    return ExtractionPlateSchema.from_orm(plate)
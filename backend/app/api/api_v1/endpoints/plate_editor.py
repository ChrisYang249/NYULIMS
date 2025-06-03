from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func
from datetime import datetime

from app.api import deps
from app.models import (
    User, Sample, SampleStatus, 
    ExtractionPlate, PlateStatus, PlateWellAssignment,
    ControlSample
)
from app.schemas.control_sample import (
    ControlSample as ControlSampleSchema,
    ControlSampleCreate,
    ControlSetRequest,
    PlateLayoutResponse,
    PlateLayoutWell
)
from app.utils.control_naming import generate_control_id, validate_control_id_unique

router = APIRouter()

@router.get("/{plate_id}/layout", response_model=PlateLayoutResponse)
def get_plate_layout(
    plate_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Get complete plate layout with samples and controls"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    # Get all samples assigned to this plate
    samples = db.query(Sample).filter(
        Sample.extraction_plate_ref_id == plate_id
    ).options(
        joinedload(Sample.project)
    ).all()
    
    # Get all controls assigned to this plate
    controls = db.query(ControlSample).filter(
        ControlSample.plate_id == plate_id
    ).all()
    
    # Create 96-well layout
    wells = []
    for row_idx in range(8):  # A-H
        for col_idx in range(12):  # 1-12
            row = chr(65 + row_idx)  # A, B, C...
            col = col_idx + 1  # 1, 2, 3...
            position = f"{row}{col}"
            
            # Check if this well has a sample
            sample = next((s for s in samples if s.extraction_well_position == position), None)
            if sample:
                wells.append(PlateLayoutWell(
                    position=position,
                    row=row,
                    column=col,
                    content_type="sample",
                    sample_id=sample.id,
                    sample_barcode=sample.barcode,
                    sample_type=sample.sample_type,
                    client_sample_id=sample.client_sample_id,
                    project_code=sample.project.project_id if sample.project else None
                ))
                continue
            
            # Check if this well has a control
            control = next((c for c in controls if c.well_position == position), None)
            if control:
                wells.append(PlateLayoutWell(
                    position=position,
                    row=row,
                    column=col,
                    content_type="control",
                    control_id=control.control_id,
                    control_type=control.control_type,
                    control_category=control.control_category
                ))
                continue
            
            # Empty well
            wells.append(PlateLayoutWell(
                position=position,
                row=row,
                column=col,
                content_type="empty"
            ))
    
    return PlateLayoutResponse(
        plate_id=plate.plate_id,
        plate_name=plate.plate_name,
        status=plate.status.value,
        wells=wells,
        sample_count=len(samples),
        control_count=len(controls),
        empty_count=96 - len(samples) - len(controls)
    )

@router.post("/{plate_id}/samples/add")
def add_samples_to_plate(
    plate_id: int,
    sample_ids: List[int],
    positions: Optional[List[str]] = None,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add samples to a draft plate"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Can only edit plates in draft status"
        )
    
    # Check if user has permission
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only supervisors can edit plates"
        )
    
    # Validate samples exist and are available
    samples = db.query(Sample).filter(
        Sample.id.in_(sample_ids),
        Sample.status == SampleStatus.EXTRACTION_QUEUE,
        Sample.extraction_plate_ref_id.is_(None)
    ).all()
    
    if len(samples) != len(sample_ids):
        raise HTTPException(
            status_code=400,
            detail="Some samples are not available for assignment"
        )
    
    # If positions provided, validate they're available
    if positions:
        if len(positions) != len(sample_ids):
            raise HTTPException(
                status_code=400,
                detail="Number of positions must match number of samples"
            )
        
        # Check positions are available
        occupied = db.query(Sample).filter(
            Sample.extraction_plate_ref_id == plate_id,
            Sample.extraction_well_position.in_(positions)
        ).count()
        
        control_occupied = db.query(ControlSample).filter(
            ControlSample.plate_id == plate_id,
            ControlSample.well_position.in_(positions)
        ).count()
        
        if occupied > 0 or control_occupied > 0:
            raise HTTPException(
                status_code=400,
                detail="Some positions are already occupied"
            )
    
    # Assign samples
    for i, sample in enumerate(samples):
        if positions:
            well_position = positions[i]
        else:
            # Auto-assign to next available position
            well_position = find_next_available_position(plate_id, db)
        
        sample.extraction_plate_ref_id = plate_id
        sample.extraction_plate_id = plate.plate_id
        sample.extraction_well_position = well_position
        
        # Create well assignment record
        well_assignment = PlateWellAssignment(
            plate_id=plate_id,
            sample_id=sample.id,
            well_position=well_position,
            well_row=well_position[0],
            well_column=int(well_position[1:])
        )
        db.add(well_assignment)
    
    db.commit()
    return {"message": f"Added {len(samples)} samples to plate"}

@router.delete("/{plate_id}/samples/{sample_id}")
def remove_sample_from_plate(
    plate_id: int,
    sample_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Remove a sample from a draft plate"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Can only edit plates in draft status"
        )
    
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only supervisors can edit plates"
        )
    
    # Find and remove sample
    sample = db.query(Sample).filter(
        Sample.id == sample_id,
        Sample.extraction_plate_ref_id == plate_id
    ).first()
    
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found on this plate")
    
    # Clear sample assignments
    sample.extraction_plate_ref_id = None
    sample.extraction_plate_id = None
    sample.extraction_well_position = None
    
    # Remove well assignment
    db.query(PlateWellAssignment).filter(
        PlateWellAssignment.plate_id == plate_id,
        PlateWellAssignment.sample_id == sample_id
    ).delete()
    
    db.commit()
    return {"message": "Sample removed from plate"}

@router.post("/{plate_id}/controls/add", response_model=List[ControlSampleSchema])
def add_control_set(
    plate_id: int,
    request: ControlSetRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Add a set of controls to a draft plate"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Can only edit plates in draft status"
        )
    
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only supervisors can edit plates"
        )
    
    # Validate positions are available
    occupied_by_samples = db.query(Sample).filter(
        Sample.extraction_plate_ref_id == plate_id,
        Sample.extraction_well_position.in_(request.positions)
    ).count()
    
    occupied_by_controls = db.query(ControlSample).filter(
        ControlSample.plate_id == plate_id,
        ControlSample.well_position.in_(request.positions)
    ).count()
    
    if occupied_by_samples > 0 or occupied_by_controls > 0:
        raise HTTPException(
            status_code=400,
            detail="Some positions are already occupied"
        )
    
    # Create controls (assuming standard positive/negative pair)
    controls = []
    control_types = ["positive", "negative"]
    
    for i, position in enumerate(request.positions):
        if i >= len(control_types):
            break  # Only create as many controls as types available
        
        control_type = control_types[i]
        control_id = generate_control_id(
            plate.plate_id, 
            control_type, 
            request.control_category,
            db,
            plate_id
        )
        
        control = ControlSample(
            control_id=control_id,
            plate_id=plate_id,
            control_type=control_type,
            control_category=request.control_category,
            well_position=position,
            well_row=position[0],
            well_column=int(position[1:]),
            lot_number=request.lot_number,
            expiration_date=request.expiration_date,
            supplier=request.supplier,
            product_name=request.product_name,
            input_volume=request.input_volume,
            elution_volume=request.elution_volume,
            notes=request.notes
        )
        
        db.add(control)
        controls.append(control)
    
    db.commit()
    
    # Refresh to get IDs
    for control in controls:
        db.refresh(control)
    
    return [ControlSampleSchema.from_orm(control) for control in controls]

@router.delete("/{plate_id}/controls/{control_id}")
def remove_control(
    plate_id: int,
    control_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Remove a control from a draft plate"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Can only edit plates in draft status"
        )
    
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only supervisors can edit plates"
        )
    
    # Find and remove control
    control = db.query(ControlSample).filter(
        ControlSample.control_id == control_id,
        ControlSample.plate_id == plate_id
    ).first()
    
    if not control:
        raise HTTPException(status_code=404, detail="Control not found on this plate")
    
    db.delete(control)
    db.commit()
    return {"message": "Control removed from plate"}

@router.put("/{plate_id}/finalize")
def finalize_plate(
    plate_id: int,
    assigned_tech_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Finalize a draft plate, making it ready for extraction"""
    plate = db.query(ExtractionPlate).filter(ExtractionPlate.id == plate_id).first()
    if not plate:
        raise HTTPException(status_code=404, detail="Extraction plate not found")
    
    if plate.status != PlateStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Can only finalize plates in draft status"
        )
    
    if current_user.role not in ['super_admin', 'lab_manager', 'director']:
        raise HTTPException(
            status_code=403,
            detail="Only supervisors can finalize plates"
        )
    
    # Validate plate has minimum requirements
    sample_count = db.query(Sample).filter(
        Sample.extraction_plate_ref_id == plate_id
    ).count()
    
    control_count = db.query(ControlSample).filter(
        ControlSample.plate_id == plate_id
    ).count()
    
    if sample_count < 1:
        raise HTTPException(
            status_code=400,
            detail="Plate must have at least 1 sample"
        )
    
    if control_count < 1:
        raise HTTPException(
            status_code=400,
            detail="Plate must have at least 1 control"
        )
    
    # Update plate status and assign technician
    plate.status = PlateStatus.FINALIZED
    plate.assigned_tech_id = assigned_tech_id
    plate.assigned_date = db.query(func.now()).scalar()
    
    db.commit()
    return {"message": "Plate finalized and assigned to technician"}

def find_next_available_position(plate_id: int, db: Session) -> str:
    """Find the next available well position (fills vertically by column)"""
    # Get all occupied positions
    sample_positions = db.query(Sample.extraction_well_position).filter(
        Sample.extraction_plate_ref_id == plate_id,
        Sample.extraction_well_position.is_not(None)
    ).all()
    
    control_positions = db.query(ControlSample.well_position).filter(
        ControlSample.plate_id == plate_id
    ).all()
    
    occupied = {pos[0] for pos in sample_positions} | {pos[0] for pos in control_positions}
    
    # Find first available position (fill vertically by column)
    for col in range(1, 13):  # 1-12
        for row_idx in range(8):  # A-H
            row = chr(65 + row_idx)
            position = f"{row}{col}"
            if position not in occupied:
                return position
    
    raise HTTPException(status_code=400, detail="No available positions on plate")
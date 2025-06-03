"""Utility functions for control sample naming"""

from sqlalchemy.orm import Session
from app.models.control_sample import ControlSample

def generate_control_id(
    plate_id: str, 
    control_type: str, 
    control_category: str,
    db: Session,
    plate_db_id: int
) -> str:
    """
    Generate unique control IDs following the pattern:
    - EXT-PTC-FK7D (first positive extraction control)
    - EXT-NTC-FK7D (first negative extraction control)
    - LP-PTC-FK7D (first positive library prep control)
    - LP-NTC-FK7D (first negative library prep control)
    - EXT-PTC-FK7D-1 (second positive extraction control)
    - EXT-PTC-FK7D-2 (third positive extraction control)
    """
    # Extract last 4 chars from plate_id (e.g., "EXT-20250206-FK7D" → "FK7D")
    plate_suffix = plate_id.split('-')[-1]
    
    # Category prefix
    cat_prefix = "EXT" if control_category == "extraction" else "LP"
    
    # Type code
    type_code = "PTC" if control_type == "positive" else "NTC"
    
    # Base ID
    base_id = f"{cat_prefix}-{type_code}-{plate_suffix}"
    
    # Count existing controls of same type/category for this plate
    existing_count = db.query(ControlSample).filter(
        ControlSample.plate_id == plate_db_id,
        ControlSample.control_type == control_type,
        ControlSample.control_category == control_category
    ).count()
    
    # If this is the first control of this type, use base ID
    if existing_count == 0:
        return base_id
    
    # Otherwise, add suffix number
    return f"{base_id}-{existing_count}"

def validate_control_id_unique(control_id: str, db: Session) -> bool:
    """Check if control ID is unique across all plates"""
    existing = db.query(ControlSample).filter(
        ControlSample.control_id == control_id
    ).first()
    return existing is None
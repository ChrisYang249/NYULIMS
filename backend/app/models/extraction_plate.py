from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base, TimestampMixin
import enum

class PlateStatus(str, enum.Enum):
    PLANNING = "planning"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ExtractionPlate(Base, TimestampMixin):
    __tablename__ = "extraction_plates"
    
    id = Column(Integer, primary_key=True, index=True)
    plate_id = Column(String, unique=True, nullable=False)  # e.g., EXT-20250206-AB12
    plate_name = Column(String)  # User-friendly name
    
    # Plate configuration
    total_wells = Column(Integer, default=96)
    sample_wells = Column(Integer, default=92)  # 96 - 4 controls
    
    # Status tracking
    status = Column(Enum(PlateStatus), default=PlateStatus.PLANNING)
    
    # Assignment info
    assigned_tech_id = Column(Integer, ForeignKey("users.id"))
    assigned_date = Column(DateTime(timezone=True))
    
    # Extraction info
    extraction_method = Column(String)
    lysis_method = Column(String)
    extraction_lot = Column(String)
    
    # Progress tracking
    started_date = Column(DateTime(timezone=True))
    completed_date = Column(DateTime(timezone=True))
    
    # Notes
    notes = Column(Text)
    
    # Control positions (standard: E12, F12 for extraction; G12, H12 for library prep)
    ext_pos_ctrl_well = Column(String, default="E12")  # Extraction positive control
    ext_neg_ctrl_well = Column(String, default="F12")  # Extraction negative control
    lp_pos_ctrl_well = Column(String, default="G12")   # Library prep positive control
    lp_neg_ctrl_well = Column(String, default="H12")   # Library prep negative control
    
    # Control tracking
    ext_pos_ctrl_id = Column(String)  # Control sample ID/barcode
    ext_neg_ctrl_id = Column(String)
    lp_pos_ctrl_id = Column(String)
    lp_neg_ctrl_id = Column(String)
    
    # QC results for controls
    ext_pos_ctrl_pass = Column(Boolean)
    ext_neg_ctrl_pass = Column(Boolean)
    ext_pos_ctrl_concentration = Column(Float)  # ng/ul
    ext_neg_ctrl_concentration = Column(Float)
    
    # Relationships
    assigned_tech = relationship("User", foreign_keys=[assigned_tech_id])
    samples = relationship("Sample", back_populates="extraction_plate_ref")
    
class PlateWellAssignment(Base, TimestampMixin):
    """Track which sample is in which well of a plate"""
    __tablename__ = "plate_well_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    plate_id = Column(Integer, ForeignKey("extraction_plates.id"), nullable=False)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=True)  # Nullable for control wells
    well_position = Column(String, nullable=False)  # A1-H12
    well_row = Column(String)  # A-H
    well_column = Column(Integer)  # 1-12
    
    # Track if this is a control well
    is_control = Column(Boolean, default=False)
    control_type = Column(String)  # 'ext_pos', 'ext_neg', 'lp_pos', 'lp_neg'
    
    # Relationships
    plate = relationship("ExtractionPlate")
    sample = relationship("Sample")
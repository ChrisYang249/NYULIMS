from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base, TimestampMixin
import enum

class ControlType(str, enum.Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"

class ControlCategory(str, enum.Enum):
    EXTRACTION = "extraction"
    LIBRARY_PREP = "library_prep"

class ControlSample(Base, TimestampMixin):
    """
    Control samples that can be added to extraction plates.
    Each control is tracked as a first-class entity with unique ID.
    """
    __tablename__ = "control_samples"
    
    id = Column(Integer, primary_key=True, index=True)
    control_id = Column(String, unique=True, nullable=False)  # e.g., "EXT-PTC-FK7D-1"
    plate_id = Column(Integer, ForeignKey("extraction_plates.id"), nullable=False)
    
    # Control specifications
    control_type = Column(String, nullable=False)  # "positive" or "negative"
    control_category = Column(String, nullable=False)  # "extraction" or "library_prep"
    set_number = Column(Integer, default=1)  # 1, 2, 3 for multiple sets
    
    # Plate position
    well_position = Column(String, nullable=False)  # A1-H12
    well_row = Column(String)  # A-H
    well_column = Column(Integer)  # 1-12
    
    # Control details
    lot_number = Column(String)
    expiration_date = Column(Date)
    supplier = Column(String)
    product_name = Column(String)
    
    # Processing volumes
    input_volume = Column(Float, default=250)  # µL
    elution_volume = Column(Float, default=100)  # µL
    
    # QC results (filled after extraction)
    concentration = Column(Float)  # ng/µL
    ratio_260_280 = Column(Float)
    ratio_260_230 = Column(Float)
    qc_pass = Column(Boolean)
    qc_notes = Column(Text)
    
    # Metadata
    notes = Column(Text)
    
    # Relationships
    plate = relationship("ExtractionPlate", back_populates="control_samples")
    
    def __repr__(self):
        return f"<ControlSample(id={self.control_id}, type={self.control_type}, well={self.well_position})>"
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

class SampleType(str, enum.Enum):
    STOOL = "stool"
    SWAB = "swab"
    DNA = "dna"
    RNA = "rna"
    FOOD = "food"
    MILK = "milk"
    DNA_PLATE = "dna_plate"
    OTHER = "other"

class SampleStatus(str, enum.Enum):
    REGISTERED = "registered"
    RECEIVED = "received"
    ACCESSIONED = "accessioned"
    IN_EXTRACTION = "in_extraction"
    EXTRACTED = "extracted"
    IN_LIBRARY_PREP = "in_library_prep"
    LIBRARY_PREPPED = "library_prepped"
    IN_SEQUENCING = "in_sequencing"
    SEQUENCED = "sequenced"
    IN_ANALYSIS = "in_analysis"
    ANALYSIS_COMPLETE = "analysis_complete"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"

class Sample(Base, TimestampMixin):
    __tablename__ = "samples"
    
    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String, unique=True, index=True, nullable=False)  # Auto-generated 6-8 digits
    client_sample_id = Column(String)  # Client's original sample ID
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    sample_type = Column(Enum(SampleType), nullable=False)
    status = Column(Enum(SampleStatus), default=SampleStatus.REGISTERED)
    
    # Re-processing tracking
    parent_sample_id = Column(Integer, ForeignKey("samples.id"))
    reprocess_type = Column(String)  # "re-extraction", "re-prep", "re-sequence"
    reprocess_reason = Column(Text)
    
    # Physical location
    storage_unit = Column(String)
    storage_shelf = Column(String)
    storage_box = Column(String)
    storage_position = Column(String)
    storage_location_id = Column(Integer, ForeignKey("storage_locations.id"))
    
    # Additional registration fields
    target_depth = Column(Float)  # Target sequencing depth
    well_location = Column(String)  # For DNA plates (A1, B2, etc.)
    due_date = Column(DateTime(timezone=True))  # Inherited from project
    
    # Accessioning info
    received_date = Column(DateTime(timezone=True))
    accessioned_date = Column(DateTime(timezone=True))
    accessioned_by_id = Column(Integer, ForeignKey("users.id"))
    accessioning_notes = Column(Text)
    
    # Pre-treatment info
    pretreatment_type = Column(String)  # "metapolyzyme", "proteinase_k", etc
    pretreatment_date = Column(DateTime(timezone=True))
    
    # Relationships
    project = relationship("Project", back_populates="samples")
    parent_sample = relationship("Sample", remote_side=[id])
    storage_location = relationship("StorageLocation", back_populates="samples")
    extraction_results = relationship("ExtractionResult", back_populates="sample")
    library_prep_results = relationship("LibraryPrepResult", back_populates="sample")
    sequencing_run_samples = relationship("SequencingRunSample", back_populates="sample")
    logs = relationship("SampleLog", back_populates="sample", order_by="desc(SampleLog.created_at)")
    
class ExtractionResult(Base, TimestampMixin):
    __tablename__ = "extraction_results"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    extraction_plan_id = Column(Integer, ForeignKey("extraction_plans.id"))
    
    # Extraction details
    extraction_kit = Column(String)
    extraction_date = Column(DateTime(timezone=True))
    extracted_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Quantification results
    qubit_lot = Column(String)
    qubit_expiration = Column(DateTime)
    dna_input_ul = Column(Float)
    concentration_ng_ul = Column(Float)  # S10 or S100 value
    r2_value = Column(Float)  # GloMax reading
    
    # QC
    passed_qc = Column(Boolean, default=True)
    qc_notes = Column(Text)
    
    sample = relationship("Sample", back_populates="extraction_results")

class LibraryPrepResult(Base, TimestampMixin):
    __tablename__ = "library_prep_results"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    prep_plan_id = Column(Integer, ForeignKey("prep_plans.id"))
    
    # Prep details
    prep_kit = Column(String)
    prep_date = Column(DateTime(timezone=True))
    prepped_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Library quantification
    library_concentration_ng_ul = Column(Float)
    library_size_bp = Column(Integer)
    
    # QC
    passed_qc = Column(Boolean, default=True)
    qc_notes = Column(Text)
    
    sample = relationship("Sample", back_populates="library_prep_results")

class SampleLog(Base, TimestampMixin):
    __tablename__ = "sample_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    comment = Column(Text, nullable=False)
    log_type = Column(String, default="comment")  # comment, status_change, extraction, library_prep, sequencing, etc.
    old_value = Column(String)  # For tracking changes
    new_value = Column(String)  # For tracking changes
    
    # User who created the log
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    sample = relationship("Sample", back_populates="logs")
    created_by = relationship("User", foreign_keys=[created_by_id])
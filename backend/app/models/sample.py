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
    extraction_results = relationship("ExtractionResult", back_populates="sample")
    library_prep_results = relationship("LibraryPrepResult", back_populates="sample")
    sequencing_run_samples = relationship("SequencingRunSample", back_populates="sample")
    
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
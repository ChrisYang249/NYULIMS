from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

class SampleType(str, enum.Enum):
    ABSCESS = "abscess"
    AIR_FILTER_FLUID = "air_filter_fluid"
    AMNIOTIC_FLUID = "amniotic_fluid"
    ANIMAL_WOUND_SWABS = "animal_wound_swabs"
    BACTERIAL_BIOFILMS = "bacterial_biofilms"
    BAL = "bal"
    BIOFILM_CULTURED = "biofilm_cultured"
    BIOFLUIDS = "biofluids"
    BIOPSY_EXTRACT = "biopsy_extract"
    BLOOD = "blood"
    BREAST_MILK = "breast_milk"
    BUCCAL_SWAB = "buccal_swab"
    BUFFER = "buffer"
    CAPSULE = "capsule"
    CARCASS_SWAB = "carcass_swab"
    CDNA = "cdna"
    CECUM = "cecum"
    CONTROL = "control"
    COW_RUMEN = "cow_rumen"
    DNA = "dna"
    DNA_CDNA = "dna_cdna"
    DNA_LIBRARY = "dna_library"
    DNA_PLATE = "dna_plate"
    ENVIRONMENTAL_SAMPLE = "environmental_sample"
    ENVIRONMENTAL_SWAB = "environmental_swab"
    ENZYMES = "enzymes"
    EQUIPMENT_SWABS = "equipment_swabs"
    FECAL_SWAB = "fecal_swab"
    FFPE_BLOCK = "ffpe_block"
    FILTER = "filter"
    FOOD_PRODUCT = "food_product"
    HAIR = "hair"
    ICELLPELLET = "icellpellet"
    ISOLATE = "isolate"
    LIBRARY_POOL = "library_pool"
    LIQUID = "liquid"
    LYOPHILIZED_POWDER = "lyophilized_powder"
    MCELLPELLET = "mcellpellet"
    MEDIA = "media"
    MILK = "milk"
    MOCK_COMMUNITY_STANDARD = "mock_community_standard"
    MUCOSA = "mucosa"
    NASAL_SAMPLE = "nasal_sample"
    NASAL_SWAB = "nasal_swab"
    OCULAR_SWAB = "ocular_swab"
    ORAL_SAMPLE = "oral_sample"
    ORAL_SWAB = "oral_swab"
    OTHER = "other"
    PAPER_POINTS = "paper_points"
    PLAQUE = "plaque"
    PLANT = "plant"
    PLASMA = "plasma"
    PLASMA_TUMOR = "plasma_tumor"
    PROBIOTIC = "probiotic"
    RECTAL_SWAB = "rectal_swab"
    RNA = "rna"
    RNA_LIBRARY = "rna_library"
    RUMEN_FLUID_PELLET = "rumen_fluid_pellet"
    SALIVA = "saliva"
    SEA_MUCILAGE = "sea_mucilage"
    SKIN_STRIP = "skin_strip"
    SKIN_SWAB = "skin_swab"
    SOIL = "soil"
    SPECIALITY = "speciality"
    SPUTUM = "sputum"
    STOOL = "stool"
    SWAB = "swab"
    TISSUE = "tissue"
    TUMOR_SAMPLES = "tumor_samples"
    URINE = "urine"
    VAGINAL_SWAB = "vaginal_swab"
    VITREOUS_WASH_SAMPLE = "vitreous_wash_sample"
    WASTEWATER = "wastewater"
    WATER = "water"
    WOUND_SWAB = "wound_swab"

class SampleStatus(str, enum.Enum):
    REGISTERED = "REGISTERED"
    RECEIVED = "RECEIVED"
    ACCESSIONING = "ACCESSIONING"  # New status
    ACCESSIONED = "ACCESSIONED"
    EXTRACTION_QUEUE = "extraction_queue"  # Samples ready for extraction planning
    IN_EXTRACTION = "IN_EXTRACTION"
    EXTRACTED = "EXTRACTED"
    DNA_QUANT_QUEUE = "dna_quant_queue"  # Samples ready for quantification
    IN_LIBRARY_PREP = "IN_LIBRARY_PREP"
    LIBRARY_PREPPED = "LIBRARY_PREPPED"
    IN_SEQUENCING = "IN_SEQUENCING"
    SEQUENCED = "SEQUENCED"
    IN_ANALYSIS = "IN_ANALYSIS"
    ANALYSIS_COMPLETE = "ANALYSIS_COMPLETE"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    DELETED = "DELETED"

class Sample(Base, TimestampMixin):
    __tablename__ = "samples"
    
    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String, unique=True, index=True, nullable=False)  # Auto-generated 6-8 digits
    client_sample_id = Column(String)  # Client's original sample ID
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    sample_type = Column(Enum(SampleType))  # Deprecated - use sample_type_id instead
    sample_type_id = Column(Integer, ForeignKey("sample_types.id"))  # New foreign key
    sample_type_other = Column(String)  # Description when sample_type is OTHER
    status = Column(String, default=SampleStatus.REGISTERED.value)
    
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
    spike_in_type = Column(String)  # Zymo spike-in options
    
    # Flags and discrepancies
    has_flag = Column(Boolean, default=False)  # General flag indicator
    flag_abbreviation = Column(String)  # Short code for flags (e.g., "PROK", "LOW_DNA", etc.)
    flag_notes = Column(Text)  # Detailed flag description
    has_discrepancy = Column(Boolean, default=False)
    discrepancy_notes = Column(Text)
    discrepancy_resolved = Column(Boolean, default=False)
    discrepancy_resolution_date = Column(DateTime(timezone=True))
    discrepancy_resolved_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Queue management fields
    queue_priority = Column(Integer, default=0)  # Higher number = higher priority
    queue_notes = Column(Text)  # Stage-specific notes
    failed_stage = Column(String)  # "extraction", "library_prep", "sequencing"
    failure_reason = Column(Text)
    reprocess_count = Column(Integer, default=0)  # Tracks E2, P2, S2 suffixes
    batch_id = Column(String)  # For grouping samples in workflow
    
    # Stage due dates
    extraction_due_date = Column(DateTime(timezone=True))
    library_prep_due_date = Column(DateTime(timezone=True))
    sequencing_due_date = Column(DateTime(timezone=True))
    
    # Extraction workflow fields
    extraction_plate_id = Column(String)  # Plate identifier
    extraction_tech_id = Column(Integer, ForeignKey("users.id"))
    extraction_assigned_date = Column(DateTime(timezone=True))
    extraction_started_date = Column(DateTime(timezone=True))
    extraction_completed_date = Column(DateTime(timezone=True))
    extraction_method = Column(String)
    extraction_notes = Column(Text)
    extraction_well_position = Column(String)  # A1-H12
    extraction_qc_pass = Column(Boolean)
    extraction_concentration = Column(Float)  # ng/ul
    extraction_volume = Column(Float)  # ul
    extraction_260_280 = Column(Float)  # Purity ratio
    extraction_260_230 = Column(Float)  # Purity ratio
    
    # Relationships
    project = relationship("Project", back_populates="samples")
    parent_sample = relationship("Sample", remote_side=[id])
    storage_location = relationship("StorageLocation", back_populates="samples")
    sample_type_ref = relationship("SampleType", back_populates="samples")
    extraction_results = relationship("ExtractionResult", back_populates="sample", cascade="all, delete-orphan")
    library_prep_results = relationship("LibraryPrepResult", back_populates="sample", cascade="all, delete-orphan")
    sequencing_run_samples = relationship("SequencingRunSample", back_populates="sample", cascade="all, delete-orphan")
    logs = relationship("SampleLog", back_populates="sample", cascade="all, delete-orphan", order_by="desc(SampleLog.created_at)")
    
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

class DiscrepancyApproval(Base, TimestampMixin):
    __tablename__ = "discrepancy_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    discrepancy_type = Column(String, nullable=False)  # Type of discrepancy
    discrepancy_details = Column(Text, nullable=False)  # Detailed description
    created_by_id = Column(Integer, ForeignKey("users.id"))  # User who created the discrepancy
    
    # Electronic signature fields (CFR Part 11)
    approved = Column(Boolean, nullable=True)  # NULL = pending, True = approved, False = rejected
    approved_by_id = Column(Integer, ForeignKey("users.id"))
    approval_date = Column(DateTime(timezone=True))
    approval_reason = Column(Text)  # Why approved despite discrepancy
    signature_meaning = Column(String, default="I approve this sample to proceed despite the noted discrepancy")
    
    # Relationships
    sample = relationship("Sample", backref="discrepancy_approvals")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    attachments = relationship("DiscrepancyAttachment", back_populates="discrepancy_approval", cascade="all, delete-orphan")


class DiscrepancyAttachment(Base, TimestampMixin):
    __tablename__ = "discrepancy_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    discrepancy_approval_id = Column(Integer, ForeignKey("discrepancy_approvals.id"), nullable=False)
    filename = Column(String, nullable=False)  # Stored filename (UUID)
    original_filename = Column(String, nullable=False)  # Original filename from user
    file_path = Column(String, nullable=False)  # Full path to file
    file_size = Column(Integer)  # Size in bytes
    file_type = Column(String)  # MIME type
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    discrepancy_approval = relationship("DiscrepancyApproval", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
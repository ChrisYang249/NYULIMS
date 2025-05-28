from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

class RunStatus(str, enum.Enum):
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"
    DEMUX = "demux"
    FAILED = "failed"

class SequencingRun(Base, TimestampMixin):
    __tablename__ = "sequencing_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String, unique=True, nullable=False)
    run_name = Column(String, nullable=False)
    status = Column(Enum(RunStatus), default=RunStatus.PLANNED)
    
    # Instrument info
    instrument_id = Column(String)
    flowcell_id = Column(String)
    reagent_lot = Column(String)
    
    # Run dates
    planned_date = Column(DateTime(timezone=True))
    start_date = Column(DateTime(timezone=True))
    completion_date = Column(DateTime(timezone=True))
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    run_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Metrics
    total_reads = Column(Integer)
    total_yield_gb = Column(Float)
    cluster_density = Column(Float)
    percent_pf = Column(Float)  # Percent passing filter
    
    notes = Column(Text)
    
    # Relationships
    samples = relationship("SequencingRunSample", back_populates="sequencing_run")

class SequencingRunSample(Base):
    __tablename__ = "sequencing_run_samples"
    
    id = Column(Integer, primary_key=True, index=True)
    sequencing_run_id = Column(Integer, ForeignKey("sequencing_runs.id"), nullable=False)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    
    # Pool info
    pool_id = Column(String)
    loading_concentration_pm = Column(Float)
    
    # Results
    reads_generated = Column(Integer)
    yield_mb = Column(Float)
    percent_q30 = Column(Float)
    
    # QC
    passed_qc = Column(Boolean)
    qc_notes = Column(Text)
    needs_resequencing = Column(Boolean, default=False)
    resequencing_reason = Column(Text)
    
    # Relationships
    sequencing_run = relationship("SequencingRun", back_populates="samples")
    sample = relationship("Sample", back_populates="sequencing_run_samples")
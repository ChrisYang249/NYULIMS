from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

class PlanStatus(str, enum.Enum):
    PLANNED = "planned"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ExtractionPlan(Base, TimestampMixin):
    __tablename__ = "extraction_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    plate_id = Column(String, unique=True, nullable=False)
    status = Column(Enum(PlanStatus), default=PlanStatus.PLANNED)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    assigned_date = Column(DateTime(timezone=True))
    
    # Completion
    completed_date = Column(DateTime(timezone=True))
    completed_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Kit info
    extraction_kit = Column(String)
    kit_lot = Column(String)
    kit_expiration = Column(DateTime)
    
    # Control positions (A1, B1, C1 typically)
    negative_control_position = Column(String, default="A1")
    positive_control_position = Column(String, default="B1")
    blank_control_position = Column(String, default="C1")
    
    notes = Column(Text)
    
    # Relationships
    samples = relationship("ExtractionPlanSample", back_populates="extraction_plan")

class ExtractionPlanSample(Base):
    __tablename__ = "extraction_plan_samples"
    
    id = Column(Integer, primary_key=True, index=True)
    extraction_plan_id = Column(Integer, ForeignKey("extraction_plans.id"), nullable=False)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    well_position = Column(String, nullable=False)  # A1-H12
    
    extraction_plan = relationship("ExtractionPlan", back_populates="samples")
    sample = relationship("Sample")

class PrepPlan(Base, TimestampMixin):
    __tablename__ = "prep_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    plate_id = Column(String, unique=True, nullable=False)
    status = Column(Enum(PlanStatus), default=PlanStatus.PLANNED)
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    assigned_date = Column(DateTime(timezone=True))
    
    # Completion
    completed_date = Column(DateTime(timezone=True))
    completed_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Kit info
    prep_kit = Column(String)
    kit_lot = Column(String)
    kit_expiration = Column(DateTime)
    
    notes = Column(Text)
    
    # Relationships
    samples = relationship("PrepPlanSample", back_populates="prep_plan")

class PrepPlanSample(Base):
    __tablename__ = "prep_plan_samples"
    
    id = Column(Integer, primary_key=True, index=True)
    prep_plan_id = Column(Integer, ForeignKey("prep_plans.id"), nullable=False)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)
    well_position = Column(String, nullable=False)
    
    prep_plan = relationship("PrepPlan", back_populates="samples")
    sample = relationship("Sample")
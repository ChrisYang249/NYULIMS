from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

class ProjectStatus(str, enum.Enum):
    RECEIVED = "received"
    ACCESSIONING = "accessioning"
    IN_EXTRACTION = "in_extraction"
    IN_LIBRARY_PREP = "in_library_prep"
    IN_SEQUENCING = "in_sequencing"
    IN_ANALYSIS = "in_analysis"
    COMPLETE = "complete"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"

class TAT(str, enum.Enum):
    DAYS_5_7 = "5-7D"
    WEEKS_1_2 = "1-2W"
    WEEKS_3_4 = "3-4W"
    WEEKS_4_6 = "4-6W"
    WEEKS_6_8 = "6-8W"
    WEEKS_8_10 = "8-10W"
    WEEKS_10_12 = "10-12W"

class Client(Base, TimestampMixin):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    institution = Column(String)
    email = Column(String, nullable=False)
    phone = Column(String)
    address = Column(Text)
    subscription_id = Column(String)
    
    projects = relationship("Project", back_populates="client")

class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String, unique=True, index=True, nullable=False)  # CP + 5 digits
    name = Column(String, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.RECEIVED)
    tat = Column(Enum(TAT), nullable=False)
    expected_sample_count = Column(Integer, nullable=False)
    project_value = Column(Float)
    notes = Column(Text)
    
    # Dates
    received_date = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True))
    completed_date = Column(DateTime(timezone=True))
    
    # File attachments (store paths)
    quote_attachment = Column(String)
    submission_form_attachment = Column(String)
    
    # Relationships
    client = relationship("Client", back_populates="projects")
    samples = relationship("Sample", back_populates="project")
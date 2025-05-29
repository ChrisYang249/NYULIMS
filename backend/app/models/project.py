from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

# Forward declaration for circular import
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.employee import Employee

class ProjectStatus(str, enum.Enum):
    PENDING = "pending"
    PM_REVIEW = "pm_review"
    LAB = "lab"
    BIS = "bis"
    HOLD = "hold"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    DELETED = "deleted"

class ProjectType(str, enum.Enum):
    WGS = "WGS"
    V1V3_16S = "V1V3_16S"
    V3V4_16S = "V3V4_16S"
    ONT_WGS = "ONT_WGS"
    ONT_V1V8 = "ONT_V1V8"
    ANALYSIS_ONLY = "ANALYSIS_ONLY"
    INTERNAL = "INTERNAL"
    CLINICAL = "CLINICAL"
    OTHER = "OTHER"

class TAT(str, enum.Enum):
    DAYS_5_7 = "DAYS_5_7"
    WEEKS_1_2 = "WEEKS_1_2"
    WEEKS_3_4 = "WEEKS_3_4"
    WEEKS_4_6 = "WEEKS_4_6"
    WEEKS_6_8 = "WEEKS_6_8"
    WEEKS_8_10 = "WEEKS_8_10"
    WEEKS_10_12 = "WEEKS_10_12"

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
    project_id = Column(String, unique=True, index=True, nullable=False)  # CMBP + 5 digits
    name = Column(String, nullable=True)  # Made optional
    project_type = Column(Enum(ProjectType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    status = Column(Enum(ProjectStatus, values_callable=lambda obj: [e.value for e in obj]), default=ProjectStatus.PENDING.value)
    tat = Column(Enum(TAT, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    expected_sample_count = Column(Integer, nullable=False)
    project_value = Column(Float)
    notes = Column(Text)
    
    # Dates
    start_date = Column(DateTime(timezone=True), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    completed_date = Column(DateTime(timezone=True))
    
    # File attachments (store paths)
    quote_attachment = Column(String)
    submission_form_attachment = Column(String)
    
    # User who created the project
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Sales representative (optional)
    sales_rep_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    
    # Relationships
    client = relationship("Client", back_populates="projects")
    samples = relationship("Sample", back_populates="project")
    logs = relationship("ProjectLog", back_populates="project", order_by="desc(ProjectLog.created_at)")
    created_by = relationship("User", foreign_keys=[created_by_id])
    sales_rep = relationship("Employee", foreign_keys=[sales_rep_id])
    attachments = relationship("ProjectAttachment", back_populates="project", cascade="all, delete-orphan")

class ProjectLog(Base, TimestampMixin):
    __tablename__ = "project_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    comment = Column(Text, nullable=False)
    log_type = Column(String, default="comment")  # comment, status_change, etc.
    
    # User who created the log
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project", back_populates="logs")
    created_by = relationship("User", foreign_keys=[created_by_id])
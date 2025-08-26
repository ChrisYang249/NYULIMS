from sqlalchemy import Column, String, Integer, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.db.base import Base

class SampleType(Base):
    __tablename__ = "sample_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)  # Internal name (e.g., 'stool')
    display_name = Column(String, nullable=False)  # Display name (e.g., 'Stool')
    description = Column(String)  # Optional description
    requires_description = Column(Boolean, default=False)  # True for "Other" type
    is_active = Column(Boolean, default=True)  # Can disable without deleting
    sort_order = Column(Integer, default=0)  # For custom ordering
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    samples = relationship("Sample", back_populates="sample_type_ref")
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin

class StorageLocation(Base, TimestampMixin):
    __tablename__ = "storage_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    freezer = Column(String, nullable=False)
    shelf = Column(String, nullable=False)
    box = Column(String, nullable=False)
    position = Column(String)  # Optional position within box
    is_available = Column(Boolean, default=True)
    notes = Column(Text)
    
    # Unique constraint on combination of freezer, shelf, box, and position
    __table_args__ = (
        {'comment': 'Storage locations for samples'},
    )
    
    # Relationships
    samples = relationship("Sample", back_populates="storage_location")
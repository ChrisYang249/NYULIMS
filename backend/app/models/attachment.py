from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.base import TimestampMixin

class ProjectAttachment(Base, TimestampMixin):
    __tablename__ = "project_attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    filename = Column(String, nullable=False)  # Stored filename (UUID-based)
    original_filename = Column(String, nullable=False)  # Original upload filename
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    file_type = Column(String)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    created_by_id = Column(Integer, ForeignKey("users.id"))
    updated_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    project = relationship("Project", back_populates="attachments")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    updated_by = relationship("User", foreign_keys=[updated_by_id])
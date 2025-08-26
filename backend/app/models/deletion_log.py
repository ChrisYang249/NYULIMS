from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class DeletionLog(Base):
    __tablename__ = "deletion_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False)  # 'sample' or 'project'
    entity_id = Column(Integer, nullable=False)
    entity_identifier = Column(String, nullable=False)  # barcode for samples, project_id for projects
    deletion_reason = Column(String, nullable=False)
    deleted_by = Column(String, nullable=False)  # User full name
    deleted_by_id = Column(Integer, nullable=False)
    deleted_at = Column(DateTime(timezone=True), server_default=func.now())
    previous_status = Column(String, nullable=False)

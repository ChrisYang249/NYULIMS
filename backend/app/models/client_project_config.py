from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.base import Base

class ClientProjectConfig(Base):
    __tablename__ = "client_project_config"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False, unique=True)
    naming_scheme = Column(String(255), nullable=False)
    prefix = Column(String(10), nullable=False)
    last_batch_number = Column(Integer, default=0)
    include_sample_types = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    client = relationship("Client", back_populates="project_config")
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class Blocker(Base):
    __tablename__ = "blockers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    units = Column(Integer, nullable=True)
    storage = Column(String, nullable=True)
    location = Column(String, nullable=True)
    function = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    created_by = relationship("User", back_populates="blockers")
    logs = relationship("BlockerLog", back_populates="blocker", cascade="all, delete-orphan")


class BlockerLog(Base):
    __tablename__ = "blocker_logs"

    id = Column(Integer, primary_key=True, index=True)
    blocker_id = Column(Integer, ForeignKey("blockers.id"), nullable=True)
    log_type = Column(String, nullable=False)  # creation, update, deletion
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    blocker = relationship("Blocker", back_populates="logs")
    created_by = relationship("User", back_populates="blocker_logs")

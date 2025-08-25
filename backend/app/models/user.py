from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # super_admin, pm, accessioner, lab_tech, lab_manager, director, sales
    is_active = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    failed_login_attempts = Column(Integer, default=0)
    last_login = Column(DateTime(timezone=True))
    last_password_change = Column(DateTime(timezone=True), server_default=func.now())
    password_history = Column(Text)  # JSON array of previous password hashes
    
    # E-signature fields
    signature_pin = Column(String)  # Hashed PIN for e-signatures
    signature_meaning = Column(String)  # Full name as it appears in signatures
    
    # Audit fields (moved from mixin for SQLAlchemy 1.4 compatibility)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    updated_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user")
    electronic_signatures = relationship("ElectronicSignature", back_populates="signer")
    blockers = relationship("Blocker", back_populates="created_by")
    blocker_logs = relationship("BlockerLog", back_populates="created_by")

class ElectronicSignature(Base):
    __tablename__ = "electronic_signatures"
    
    id = Column(Integer, primary_key=True, index=True)
    signer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    record_type = Column(String, nullable=False)  # e.g., "extraction_plan", "prep_plan", "project_approval"
    record_id = Column(Integer, nullable=False)
    signature_meaning = Column(String, nullable=False)
    signature_reason = Column(String, nullable=False)
    signed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String)
    
    signer = relationship("User", back_populates="electronic_signatures")
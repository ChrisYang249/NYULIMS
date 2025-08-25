from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
from app.models.base import TimestampMixin
import enum

class QuotationStatus(str, enum.Enum):
    NO = "No"
    YES = "Yes"
    YES_AMAZON_LINK = "Yes (amazon link)"
    REQUESTED = "Requested"
    DIRECT_INVOICE = "Direct invoice"

class ProductStatus(str, enum.Enum):
    RECEIVED = "Received"
    REQUESTED = "Requested"
    RENEWED = "Renewed"
    PENDING = "Pending"
    ISSUED = "Issued"

class Requestor(str, enum.Enum):
    LAB = "Lab"
    YANA = "Yana"
    MOHSIN = "Mohsin"
    MALVIKA = "Malvika"
    ASHUTOSH = "Ashutosh"
    PRIYAM = "Priyam"
    BALAZS = "Balazs"
    OTHER = "Other"

class Storage(str, enum.Enum):
    FREEZER = "Freezer"
    SHELF = "Shelf"
    BOX = "Box"
    OTHER = "Other"

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Chemical/Product name
    quantity = Column(Integer)  # Quantity (now optional)
    catalog_number = Column(String)  # Cat no. / Unique identifier
    order_date = Column(DateTime)  # Date (now optional)
    requestor = Column(String)  # Requestor's name (now optional)
    quotation_status = Column(String)  # Quotation provided/asked for
    total_value = Column(Float)  # Total order value
    status = Column(String)  # Status
    requisition_id = Column(String)  # Requisition ID/ PO number
    vendor = Column(String)  # Vendor name (now optional)
    chartfield = Column(String)  # Chartfield
    notes = Column(Text)  # Additional notes
    storage = Column(String)  # Storage type (freezer, shelf, box, other)
    
    # Timestamp fields
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"))
    
    # Relationships
    created_by = relationship("User", foreign_keys=[created_by_id])

class ProductLog(Base):
    __tablename__ = "product_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    log_type = Column(String, nullable=False)  # "creation", "update", "deletion"
    old_value = Column(Text)  # Previous state (for updates/deletions)
    new_value = Column(Text)  # New state (for updates/creations)
    comment = Column(Text)  # Additional notes
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    product = relationship("Product")
    created_by = relationship("User", foreign_keys=[created_by_id])

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Storage(str, Enum):
    FREEZER = "freezer"
    SHELF = "shelf"
    BOX = "box"
    OTHER = "other"

class QuotationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NOT_REQUIRED = "not_required"

class ProductStatus(str, Enum):
    REQUESTED = "requested"
    ORDERED = "ordered"
    RECEIVED = "received"

class Requestor(str, Enum):
    LAB_MEMBER = "lab_member"
    PI = "pi"
    ADMIN = "admin"
    EXTERNAL = "external"

class ProductBase(BaseModel):
    name: str = Field(..., description="Product name")
    quantity: Optional[int] = Field(None, description="Quantity ordered")
    catalog_number: Optional[str] = Field(None, description="Catalog number")
    order_date: Optional[datetime] = Field(None, description="Order date")
    requestor: Optional[str | List[str]] = Field(None, description="Requestor(s)")  # Can be string or array of strings
    quotation_status: Optional[str] = Field(None, description="Quotation status")  # Changed from QuotationStatus enum to str
    total_value: Optional[float] = Field(None, description="Total order value")
    status: Optional[str] = Field(None, description="Product status")  # Changed from ProductStatus enum to str
    requisition_id: Optional[str] = Field(None, description="Requisition ID/PO number")
    vendor: Optional[str] = Field(None, description="Vendor name")
    chartfield: Optional[str] = Field(None, description="Chartfield")
    notes: Optional[str] = Field(None, description="Additional notes")
    storage: Optional[str] = Field(None, description="Storage type")  # Changed from Storage enum to str

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    catalog_number: Optional[str] = None
    order_date: Optional[datetime] = None
    requestor: Optional[str | List[str]] = None  # Can be string or array of strings
    quotation_status: Optional[str] = None  # Changed from QuotationStatus enum to str
    total_value: Optional[float] = None
    status: Optional[str] = None  # Changed from ProductStatus enum to str
    requisition_id: Optional[str] = None
    vendor: Optional[str] = None
    chartfield: Optional[str] = None
    notes: Optional[str] = None
    storage: Optional[str] = None  # Changed from Storage enum to str

class Product(ProductBase):
    id: int
    created_at: datetime
    created_by_id: int
    created_by: Optional[dict] = None

    class Config:
        from_attributes = True

class ProductList(BaseModel):
    id: int
    name: str
    quantity: Optional[int] = None
    catalog_number: Optional[str] = None
    order_date: Optional[datetime] = None
    requestor: Optional[str] = None  # Keep as string for display compatibility
    quotation_status: Optional[str] = None  # Changed from QuotationStatus enum to str
    total_value: Optional[float] = None
    status: Optional[str] = None  # Changed from ProductStatus enum to str
    requisition_id: Optional[str] = None
    vendor: Optional[str] = None
    chartfield: Optional[str] = None
    notes: Optional[str] = None
    storage: Optional[str] = None  # Changed from Storage enum to str
    created_at: datetime
    created_by_id: int
    created_by: Optional[dict] = None

    class Config:
        from_attributes = True

class ProductLog(BaseModel):
    id: int
    product_id: Optional[int] = None
    log_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    comment: Optional[str] = None
    created_at: datetime
    created_by_id: int
    created_by: Optional[dict] = None

    class Config:
        from_attributes = True

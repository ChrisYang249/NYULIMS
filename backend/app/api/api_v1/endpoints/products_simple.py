from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
import logging

from app.api import deps
from app.models.product import Product, QuotationStatus, ProductStatus, Requestor, Storage, ProductLog
from app.schemas.product import ProductCreate, ProductUpdate, Product as ProductSchema, ProductList, ProductLog as ProductLogSchema

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[ProductList])
def get_products(
    db: Session = Depends(deps.get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    requestor: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
):
    """
    Retrieve products with optional filtering.
    """
    query = db.query(Product).options(joinedload(Product.created_by))
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            Product.name.ilike(search_term) |
            Product.catalog_number.ilike(search_term) |
            Product.vendor.ilike(search_term)
        )
    
    if requestor:
        query = query.filter(Product.requestor == requestor)
    
    if status:
        query = query.filter(Product.status == status)
    
    if vendor:
        query = query.filter(Product.vendor.ilike(f"%{vendor}%"))
    
    products = query.order_by(Product.order_date.desc().nullslast()).offset(skip).limit(limit).all()
    
    # Convert products to dict format for response
    result = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "quantity": product.quantity,
            "catalog_number": product.catalog_number,
            "order_date": product.order_date,
            "requestor": product.requestor,
            "quotation_status": product.quotation_status,
            "total_value": product.total_value,
            "status": product.status,
            "requisition_id": product.requisition_id,
            "vendor": product.vendor,
            "chartfield": product.chartfield,
            "notes": product.notes,
            "storage": product.storage,
            "created_at": product.created_at,
            "created_by_id": product.created_by_id,
            "created_by": {
                "id": product.created_by.id,
                "full_name": product.created_by.full_name,
                "email": product.created_by.email
            } if product.created_by else None
        }
        result.append(product_dict)
    
    return result

@router.post("/", response_model=ProductSchema)
def create_product(
    *,
    db: Session = Depends(deps.get_db),
    product_in: ProductCreate,
):
    """
    Create new product.
    """
    logger.info(f"Creating new product: {product_in.name}")
    
    try:
        # Handle multiple requestors - convert array to comma-separated string
        product_data = product_in.model_dump()
        if isinstance(product_data.get('requestor'), list):
            product_data['requestor'] = ', '.join(product_data['requestor'])
        
        product = Product(
            **product_data,
            created_by_id=1  # Default admin user ID
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info(f"Created product with ID: {product.id}")
        
        # Convert product to dict format for response
        product_dict = {
            "id": product.id,
            "name": product.name,
            "quantity": product.quantity,
            "catalog_number": product.catalog_number,
            "order_date": product.order_date,
            "requestor": product.requestor,
            "quotation_status": product.quotation_status,
            "total_value": product.total_value,
            "status": product.status,
            "requisition_id": product.requisition_id,
            "vendor": product.vendor,
            "chartfield": product.chartfield,
            "notes": product.notes,
            "storage": product.storage,
            "created_at": product.created_at,
            "created_by_id": product.created_by_id,
            "created_by": {
                "id": 1,
                "full_name": "Admin User",
                "email": "admin@lims.com"
            }
        }
        return product_dict
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@router.get("/enums/requestors")
def get_requestors():
    """Get all available requestor options."""
    return [r.value for r in Requestor]

@router.get("/enums/statuses")
def get_statuses():
    """Get all available status options."""
    return [s.value for s in ProductStatus]

@router.get("/enums/quotation-statuses")
def get_quotation_statuses():
    """Get all available quotation status options."""
    return [qs.value for qs in QuotationStatus]

@router.get("/enums/storage")
def get_storage_options():
    """Get all available storage options."""
    return [s.value for s in Storage]

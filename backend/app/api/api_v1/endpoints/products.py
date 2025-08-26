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
    requestor: Optional[str] = Query(None),  # Changed from Requestor enum to str
    status: Optional[str] = Query(None),  # Changed from ProductStatus enum to str
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
    current_user: User = Depends(deps.get_current_user),
):
    """
    Create new product.
    """
    logger.info(f"Creating new product by user {current_user.id}: {product_in.name}")
    
    try:
        # Handle multiple requestors - convert array to comma-separated string
        product_data = product_in.model_dump()
        if isinstance(product_data.get('requestor'), list):
            product_data['requestor'] = ', '.join(product_data['requestor'])
        
        product = Product(
            **product_data,
            created_by_id=current_user.id
        )
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info(f"Created product with ID: {product.id}")
        
        # Log the creation
        from app.models import ProductLog
        import json
        
        # Convert datetime objects to strings for JSON serialization
        product_data = product_in.model_dump()
        if product_data.get('order_date'):
            product_data['order_date'] = product_data['order_date'].isoformat()
        
        product_log = ProductLog(
            product_id=product.id,
            log_type="creation",
            new_value=json.dumps(product_data),
            comment=f"Product created by {current_user.full_name}",
            created_by_id=current_user.id
        )
        db.add(product_log)
        db.commit()
        logger.info(f"Created creation log for product {product.id}")
        
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
                "id": current_user.id,
                "full_name": current_user.full_name,
                "email": current_user.email
            }
        }
        return product_dict
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@router.get("/{product_id}", response_model=ProductSchema)
def get_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get product by ID.
    """
    product = db.query(Product).options(joinedload(Product.created_by)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
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
            "id": product.created_by.id,
            "full_name": product.created_by.full_name,
            "email": product.created_by.email
        } if product.created_by else None
    }
    return product_dict

@router.put("/{product_id}", response_model=ProductSchema)
def update_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    product_in: ProductUpdate,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Update product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Store old values for logging
    old_values = {
        "name": product.name,
        "quantity": product.quantity,
        "catalog_number": product.catalog_number,
        "order_date": product.order_date.isoformat() if product.order_date else None,
        "requestor": product.requestor,
        "quotation_status": product.quotation_status,
        "total_value": product.total_value,
        "status": product.status,
        "requisition_id": product.requisition_id,
        "vendor": product.vendor,
        "chartfield": product.chartfield,
        "notes": product.notes
    }
    
    update_data = product_in.model_dump(exclude_unset=True)
    
    logger.info(f"Update data received: {update_data}")  # Debug log
    
    # Handle multiple requestors - convert array to comma-separated string
    if isinstance(update_data.get('requestor'), list):
        update_data['requestor'] = ', '.join(update_data['requestor'])
        logger.info(f"Converted requestor array to string: {update_data['requestor']}")  # Debug log
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Log the update
    from app.models import ProductLog
    import json
    
    # Convert datetime objects to strings for JSON serialization
    if update_data.get('order_date'):
        update_data['order_date'] = update_data['order_date'].isoformat()
    
    product_log = ProductLog(
        product_id=product.id,
        log_type="update",
        old_value=json.dumps(old_values),
        new_value=json.dumps(update_data),
        comment=f"Product updated by {current_user.full_name}",
        created_by_id=current_user.id
    )
    db.add(product_log)
    db.commit()
    
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
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email
        }
    }
    return product_dict

@router.delete("/{product_id}")
def delete_product(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: User = Depends(deps.get_current_user),
):
    """
    Delete product.
    """
    logger.info(f"Attempting to delete product {product_id} by user {current_user.id}")
    
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        logger.warning(f"Product {product_id} not found")
        raise HTTPException(status_code=404, detail="Product not found")
    
    try:
        # Log the deletion
        from app.models import ProductLog
        import json
        
        # Create a log entry for the deletion
        product_log = ProductLog(
            product_id=product_id,
            log_type="deletion",
            old_value=json.dumps({
                "name": product.name,
                "quantity": product.quantity,
                "catalog_number": product.catalog_number,
                "order_date": product.order_date.isoformat() if product.order_date else None,
                "requestor": product.requestor,
                "quotation_status": product.quotation_status,
                "total_value": product.total_value,
                "status": product.status,
                "requisition_id": product.requisition_id,
                "vendor": product.vendor,
                "chartfield": product.chartfield,
                "notes": product.notes,
                "storage": product.storage
            }),
            comment=f"Product deleted by {current_user.full_name}",
            created_by_id=current_user.id
        )
        db.add(product_log)
        db.commit()  # Commit the deletion log first
        logger.info(f"Created deletion log for product {product_id}")
        
        # Delete ALL logs for this product first (including creation and update logs)
        db.query(ProductLog).filter(ProductLog.product_id == product_id).delete()
        logger.info(f"Deleted all logs for product {product_id}")
        
        # Now delete the product
        db.delete(product)
        db.commit()
        logger.info(f"Successfully deleted product {product_id}")
        return {"message": "Product deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")

@router.get("/enums/requestors")
def get_requestors():
    """
    Get all available requestor options.
    """
    return [{"value": req.value, "label": req.value} for req in Requestor]

@router.get("/enums/statuses")
def get_statuses():
    """
    Get all available status options.
    """
    return [{"value": status.value, "label": status.value} for status in ProductStatus]

@router.get("/enums/quotation-statuses")
def get_quotation_statuses():
    """
    Get all available quotation status options.
    """
    return [{"value": status.value, "label": status.value} for status in QuotationStatus]

@router.get("/enums/storage")
def get_storage_options():
    """
    Get all available storage options.
    """
    return [{"value": storage.value, "label": storage.value} for storage in Storage]

@router.get("/{product_id}/logs", response_model=List[ProductLogSchema])
def get_product_logs(
    product_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get logs for a specific product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    logs = db.query(ProductLog).options(
        joinedload(ProductLog.created_by)
    ).filter(
        ProductLog.product_id == product_id
    ).order_by(ProductLog.created_at.desc()).all()
    
    # Convert logs to dict format for response
    result = []
    for log in logs:
        log_dict = {
            "id": log.id,
            "product_id": log.product_id,
            "log_type": log.log_type,
            "old_value": log.old_value,
            "new_value": log.new_value,
            "comment": log.comment,
            "created_at": log.created_at,
            "created_by_id": log.created_by_id,
            "created_by": {
                "id": log.created_by.id,
                "full_name": log.created_by.full_name,
                "email": log.created_by.email
            } if log.created_by else None
        }
        result.append(log_dict)
    
    return result

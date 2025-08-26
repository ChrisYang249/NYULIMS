from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime

from app.api import deps
from app.models import Product, ProductStatus

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(deps.get_db),
) -> Any:
    """Get dashboard statistics"""
    
    # Total count of all products
    total_products = db.query(func.count(Product.id)).scalar() or 0
    
    # Count orders completed in current month (received status)
    current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    completed_orders_this_month = db.query(func.count(Product.id)).filter(
        Product.status == ProductStatus.RECEIVED,
        Product.updated_at >= current_month_start
    ).scalar() or 0
    
    # Count renewed orders
    renewed_orders = db.query(func.count(Product.id)).filter(
        Product.status == ProductStatus.RENEWED
    ).scalar() or 0
    
    # Count requested orders
    requested_orders = db.query(func.count(Product.id)).filter(
        Product.status == ProductStatus.REQUESTED
    ).scalar() or 0
    
    # Count products with pending status (only PENDING, not REQUESTED)
    pending_orders = db.query(func.count(Product.id)).filter(
        Product.status == ProductStatus.PENDING
    ).scalar() or 0
    
    # Count issued orders
    issued_orders = db.query(func.count(Product.id)).filter(
        Product.status == ProductStatus.ISSUED
    ).scalar() or 0
    
    return {
        "total_products": total_products,
        "completed_orders": completed_orders_this_month,  # Keep the same data, just cleaner name
        "renewed_orders": renewed_orders,
        "requested_orders": requested_orders,
        "pending_orders": pending_orders,
        "issued_orders": issued_orders
    }

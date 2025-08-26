from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy import text
import logging

from app.api import deps
from app.crud import user as crud_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create-admin")
async def create_admin_user(db: Session = Depends(deps.get_db)):
    """Create admin user if it doesn't exist"""
    try:
        # Check if admin already exists
        existing_admin = crud_user.get_user_by_username(db, "admin")
        if existing_admin:
            return {"message": "Admin user already exists", "username": "admin", "password": "Admin123!"}
        
        # Create admin user
        user_data = {
            "email": "admin@lims.com",
            "username": "admin",
            "full_name": "Admin User",
            "role": "super_admin",
            "password": "Admin123!"
        }
        
        user = crud_user.create_user(db, user_data)
        logger.info(f"Admin user created successfully: {user.username}")
        
        return {
            "message": "Admin user created successfully!",
            "username": "admin",
            "password": "Admin123!",
            "user_id": user.id
        }
        
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin user: {str(e)}"
        )

@router.post("/populate-data")
async def populate_sample_data(db: Session = Depends(deps.get_db)):
    """Populate database with sample blockers and products"""
    try:
        # Get admin user
        admin_user = crud_user.get_user_by_username(db, "admin")
        if not admin_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin user not found. Create admin first."
            )
        
        # Sample blockers data
        blockers_data = [
            {
                "name": "EP Blocker 001",
                "units": 50,
                "storage": "Freezer",
                "location": "Lab A - Shelf 1",
                "function": "Primary antibody blocking for Western blot",
                "notes": "Expires 2025-06-15"
            },
            {
                "name": "EP Blocker 002",
                "units": 25,
                "storage": "Refrigerator",
                "location": "Lab B - Drawer 3",
                "function": "Secondary antibody blocking for immunofluorescence",
                "notes": "New batch received 2025-01-20"
            },
            {
                "name": "EP Blocker 003",
                "units": 100,
                "storage": "Freezer",
                "location": "Lab A - Shelf 2",
                "function": "Non-specific protein blocking for ELISA",
                "notes": "High demand item"
            }
        ]
        
        # Sample products data
        products_data = [
            {
                "name": "C57 males",
                "quantity": 150,
                "catalog_number": "",
                "order_date": "2023-09-01",
                "requestor": "Lab",
                "quotation_status": "No",
                "total_value": 0.0,
                "status": "Received",
                "requisition_id": "",
                "vendor": "",
                "chartfield": "76/71260/AD176",
                "notes": "",
                "storage": "Other"
            },
            {
                "name": "CL 316243 disodium salt, 10 mg",
                "quantity": 2,
                "catalog_number": "10/1/1499",
                "order_date": "2023-09-01",
                "requestor": "Yana",
                "quotation_status": "Yes",
                "total_value": 2600.0,
                "status": "Received",
                "requisition_id": "55159",
                "vendor": "Tochris",
                "chartfield": "Biology P-card",
                "notes": "Order was cancelled due to budget issues",
                "storage": "Freezer"
            },
            {
                "name": "RT² qPCR Primer Assay for Mice Rplp0",
                "quantity": 6,
                "catalog_number": "",
                "order_date": "2025-01-30",
                "requestor": "Yana",
                "quotation_status": "Provided",
                "total_value": 6000.0,
                "status": "Received",
                "requisition_id": "61787",
                "vendor": "",
                "chartfield": "76-71260-ADHPG-AD176-00010",
                "notes": "",
                "storage": "Freezer"
            }
        ]
        
        blockers_inserted = 0
        products_inserted = 0
        
        # Insert blockers
        for blocker_data in blockers_data:
            try:
                insert_query = text("""
                    INSERT INTO blockers (
                        name, units, storage, location, function, notes, created_by_id
                    ) VALUES (
                        :name, :units, :storage, :location, :function, :notes, :created_by_id
                    ) RETURNING id
                """)
                
                result = db.execute(insert_query, {
                    "name": blocker_data["name"],
                    "units": blocker_data["units"],
                    "storage": blocker_data["storage"],
                    "location": blocker_data["location"],
                    "function": blocker_data["function"],
                    "notes": blocker_data["notes"],
                    "created_by_id": admin_user.id
                })
                
                blocker_id = result.fetchone()[0]
                
                # Create log entry
                log_query = text("""
                    INSERT INTO blocker_logs (
                        blocker_id, log_type, new_value, created_by_id
                    ) VALUES (
                        :blocker_id, 'creation', :new_value, :created_by_id
                    )
                """)
                
                db.execute(log_query, {
                    "blocker_id": blocker_id,
                    "new_value": f"Blocker '{blocker_data['name']}' created",
                    "created_by_id": admin_user.id
                })
                
                blockers_inserted += 1
                
            except Exception as e:
                logger.error(f"Error inserting blocker {blocker_data['name']}: {e}")
                continue
        
        # Insert products
        for product_data in products_data:
            try:
                order_date = None
                if product_data.get("order_date"):
                    order_date = datetime.strptime(product_data["order_date"], "%Y-%m-%d")
                
                insert_query = text("""
                    INSERT INTO products (
                        name, quantity, catalog_number, order_date, requestor,
                        quotation_status, total_value, status, requisition_id,
                        vendor, chartfield, notes, storage, created_by_id
                    ) VALUES (
                        :name, :quantity, :catalog_number, :order_date, :requestor,
                        :quotation_status, :total_value, :status, :requisition_id,
                        :vendor, :chartfield, :notes, :storage, :created_by_id
                    ) RETURNING id
                """)
                
                result = db.execute(insert_query, {
                    "name": product_data["name"],
                    "quantity": product_data["quantity"],
                    "catalog_number": product_data["catalog_number"],
                    "order_date": order_date,
                    "requestor": product_data["requestor"],
                    "quotation_status": product_data["quotation_status"],
                    "total_value": product_data["total_value"],
                    "status": product_data["status"],
                    "requisition_id": product_data["requisition_id"],
                    "vendor": product_data["vendor"],
                    "chartfield": product_data["chartfield"],
                    "notes": product_data["notes"],
                    "storage": product_data["storage"],
                    "created_by_id": admin_user.id
                })
                
                product_id = result.fetchone()[0]
                
                # Create log entry
                log_query = text("""
                    INSERT INTO product_logs (
                        product_id, log_type, new_value, created_by_id
                    ) VALUES (
                        :product_id, 'creation', :new_value, :created_by_id
                    )
                """)
                
                db.execute(log_query, {
                    "product_id": product_id,
                    "new_value": f"Product '{product_data['name']}' created",
                    "created_by_id": admin_user.id
                })
                
                products_inserted += 1
                
            except Exception as e:
                logger.error(f"Error inserting product {product_data['name']}: {e}")
                continue
        
        db.commit()
        
        return {
            "message": "Sample data populated successfully!",
            "blockers_inserted": blockers_inserted,
            "products_inserted": products_inserted,
            "total_blockers": blockers_inserted,
            "total_products": products_inserted
        }
        
    except Exception as e:
        logger.error(f"Error populating data: {e}")
        if 'db' in locals():
            db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to populate data: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

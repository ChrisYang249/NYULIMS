from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import logging
from sqlalchemy import text

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.db.base import engine, Base, SessionLocal
from app.models import *  # Import all models
from app.crud.user import create_user, get_user_by_username

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    try:
        # Try to create tables, but don't fail if they already exist
        Base.metadata.create_all(bind=engine, checkfirst=True)
        logger.info("Database tables initialized successfully")
        
        # Create admin user if it doesn't exist
        db = SessionLocal()
        try:
            existing_admin = get_user_by_username(db, "admin")
            if not existing_admin:
                logger.info("Creating admin user...")
                user_data = {
                    "email": "admin@lims.com",
                    "username": "admin",
                    "full_name": "Admin User",
                    "role": "super_admin",
                    "password": "Admin123!"
                }
                create_user(db, user_data)
                logger.info("Admin user created successfully!")
                logger.info("Username: admin, Password: Admin123!")
            else:
                logger.info("Admin user already exists")
            
            # Populate sample data if database is empty
            try:
                # Check if we have any products
                result = db.execute(text("SELECT COUNT(*) FROM products"))
                product_count = result.fetchone()[0]
                
                result = db.execute(text("SELECT COUNT(*) FROM blockers"))
                blocker_count = result.fetchone()[0]
                
                if product_count == 0 and blocker_count == 0:
                    logger.info("Database is empty, populating with sample data...")
                    
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
                                "created_by_id": existing_admin.id if existing_admin else 1
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
                                "created_by_id": existing_admin.id if existing_admin else 1
                            })
                            
                            logger.info(f"Inserted blocker: {blocker_data['name']}")
                            
                        except Exception as e:
                            logger.error(f"Error inserting blocker {blocker_data['name']}: {e}")
                            continue
                    
                    # Insert products
                    for product_data in products_data:
                        try:
                            order_date = None
                            if product_data.get("order_date"):
                                from datetime import datetime
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
                                "created_by_id": existing_admin.id if existing_admin else 1
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
                                "created_by_id": existing_admin.id if existing_admin else 1
                            })
                            
                            logger.info(f"Inserted product: {product_data['name']}")
                            
                        except Exception as e:
                            logger.error(f"Error inserting product {product_data['name']}: {e}")
                            continue
                    
                    db.commit()
                    logger.info("Sample data populated successfully!")
                else:
                    logger.info(f"Database already has data: {product_count} products, {blocker_count} blockers")
                    
            except Exception as e:
                logger.warning(f"Error populating sample data: {e}")
                
        except Exception as e:
            logger.warning(f"Error creating admin user: {e}")
        finally:
            db.close()
            
    except Exception as e:
        logger.warning(f"Database initialization warning: {e}")
        logger.info("Continuing with existing database schema...")
    yield
    # Shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",  # React dev servers
        "https://nyu-lims-frontend.onrender.com",  # Render frontend
        "https://nyulims-frontend.onrender.com"    # Alternative URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audit logging middleware
@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Log API access (you can expand this to save to database)
    logger.info(
        f"Path: {request.url.path} | Method: {request.method} | "
        f"Status: {response.status_code} | Duration: {process_time:.3f}s"
    )
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "LIMS System API", "version": settings.VERSION}
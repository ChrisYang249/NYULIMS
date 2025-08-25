#!/usr/bin/env python3
"""
Script to populate Render database with sample products and blockers data.
Run this on Render's shell to populate your deployed database.
"""

import sys
import os
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

# Add the current directory to Python path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample EP Blockers Data
BLOCKERS_DATA = [
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
    },
    {
        "name": "EP Blocker 004",
        "units": 30,
        "storage": "Room Temperature",
        "location": "Lab C - Cabinet 1",
        "function": "Membrane blocking for dot blot",
        "notes": "Stable at RT for 6 months"
    },
    {
        "name": "EP Blocker 005",
        "units": 75,
        "storage": "Freezer",
        "location": "Lab B - Shelf 4",
        "function": "Cell culture blocking agent",
        "notes": "Use within 2 weeks of thawing"
    }
]

# Sample Products Data (subset of your existing data)
PRODUCTS_DATA = [
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
        "name": "Magnifying glass with light (for surgery)",
        "quantity": 2,
        "catalog_number": "2--",
        "order_date": "2023-09-12",
        "requestor": "Mohsin",
        "quotation_status": "Yes (amazon link)",
        "total_value": 538.0,
        "status": "Received",
        "requisition_id": "",
        "vendor": "Amazon",
        "chartfield": "Biology P-card",
        "notes": "2 * 269 AED",
        "storage": "Shelf"
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
    },
    {
        "name": "Leptin ELISA Kits",
        "quantity": 5,
        "catalog_number": "ab100718",
        "order_date": "2025-01-30",
        "requestor": "Yana",
        "quotation_status": "Provided",
        "total_value": 12525.0,
        "status": "Received",
        "requisition_id": "R_49ujLQItYso4Pi9",
        "vendor": "Abcam",
        "chartfield": "76-71260-ADHPG-AD176-00011",
        "notes": "2505*5 AED",
        "storage": "Freezer"
    },
    {
        "name": "Thermo Scientific-Water Bath-Precision General Purpose Water Bath",
        "quantity": 1,
        "catalog_number": "",
        "order_date": "2025-01-30",
        "requestor": "Priyam",
        "quotation_status": "Provided",
        "total_value": 6586.48,
        "status": "Received",
        "requisition_id": "62264",
        "vendor": "Thermo Scientific",
        "chartfield": "CGSB Chartfield",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "NEBNext® UltraTM II RNA Library Prep with Sample Purification Beads - 96 reactions",
        "quantity": 3,
        "catalog_number": "E7775L",
        "order_date": "2025-04-09",
        "requestor": "Yana",
        "quotation_status": "Provided",
        "total_value": 33925.5,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "11,308.50 USD",
        "storage": "Freezer"
    }
]

def get_default_user_id(db):
    """Get the first user ID from the database (usually admin)"""
    try:
        result = db.execute(text("SELECT id FROM users LIMIT 1"))
        user = result.fetchone()
        if not user:
            logger.error("No users found in database. Please create a user first.")
            return None
        return user[0]
    except Exception as e:
        logger.error(f"Error getting user ID: {e}")
        return None

def insert_blockers(db, default_user_id):
    """Insert sample blockers into the database"""
    if not default_user_id:
        logger.error("No default user ID provided")
        return 0
    
    inserted_count = 0
    
    for blocker_data in BLOCKERS_DATA:
        try:
            # Insert blocker
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
                "created_by_id": default_user_id
            })
            
            blocker_id = result.fetchone()[0]
            
            # Create a log entry for the creation
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
                "created_by_id": default_user_id
            })
            
            inserted_count += 1
            logger.info(f"Inserted blocker: {blocker_data['name']} (ID: {blocker_id})")
            
        except Exception as e:
            logger.error(f"Error inserting blocker {blocker_data['name']}: {e}")
            continue
    
    return inserted_count

def insert_products(db, default_user_id):
    """Insert sample products into the database"""
    if not default_user_id:
        logger.error("No default user ID provided")
        return 0
    
    inserted_count = 0
    
    for product_data in PRODUCTS_DATA:
        try:
            # Convert order_date string to datetime if provided
            order_date = None
            if product_data.get("order_date"):
                order_date = datetime.strptime(product_data["order_date"], "%Y-%m-%d")
            
            # Insert product
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
                "created_by_id": default_user_id
            })
            
            product_id = result.fetchone()[0]
            
            # Create a log entry for the creation
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
                "created_by_id": default_user_id
            })
            
            inserted_count += 1
            logger.info(f"Inserted product: {product_data['name']} (ID: {product_id})")
            
        except Exception as e:
            logger.error(f"Error inserting product {product_data['name']}: {e}")
            continue
    
    return inserted_count

def populate_database():
    """Main function to populate the database with sample data"""
    
    try:
        # Create database connection
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)
        db = SessionLocal()
        
        logger.info("Connected to database successfully")
        
        # Get default user ID
        default_user_id = get_default_user_id(db)
        if not default_user_id:
            logger.error("Cannot proceed without a user in the database")
            return
        
        logger.info(f"Using user ID: {default_user_id}")
        
        # Insert blockers
        logger.info("=" * 50)
        logger.info("INSERTING BLOCKERS...")
        logger.info("=" * 50)
        blockers_inserted = insert_blockers(db, default_user_id)
        
        # Insert products
        logger.info("=" * 50)
        logger.info("INSERTING PRODUCTS...")
        logger.info("=" * 50)
        products_inserted = insert_products(db, default_user_id)
        
        # Commit all changes
        db.commit()
        
        # Show summary
        logger.info("=" * 50)
        logger.info("POPULATION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Blockers inserted: {blockers_inserted}")
        logger.info(f"Products inserted: {products_inserted}")
        
        # Show total counts
        result = db.execute(text("SELECT COUNT(*) FROM blockers"))
        total_blockers = result.fetchone()[0]
        
        result = db.execute(text("SELECT COUNT(*) FROM products"))
        total_products = result.fetchone()[0]
        
        logger.info(f"Total blockers in database: {total_blockers}")
        logger.info(f"Total products in database: {total_products}")
        logger.info("=" * 50)
        logger.info("Database population completed successfully! 🎉")
        
    except Exception as e:
        logger.error(f"Database error: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

def show_current_data():
    """Show current data in the database"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)
        db = SessionLocal()
        
        # Show blockers
        result = db.execute(text("""
            SELECT id, name, units, storage, location 
            FROM blockers 
            ORDER BY created_at DESC 
            LIMIT 5
        """))
        
        blockers = result.fetchall()
        
        logger.info("=" * 50)
        logger.info("CURRENT BLOCKERS IN DATABASE:")
        logger.info("=" * 50)
        if blockers:
            for blocker in blockers:
                logger.info(f"ID: {blocker[0]}, Name: {blocker[1]}, Units: {blocker[2]}, Storage: {blocker[3]}")
        else:
            logger.info("No blockers found in database")
        
        # Show products
        result = db.execute(text("""
            SELECT id, name, quantity, status, vendor 
            FROM products 
            ORDER BY created_at DESC 
            LIMIT 5
        """))
        
        products = result.fetchall()
        
        logger.info("=" * 50)
        logger.info("CURRENT PRODUCTS IN DATABASE:")
        logger.info("=" * 50)
        if products:
            for product in products:
                logger.info(f"ID: {product[0]}, Name: {product[1]}, Qty: {product[2]}, Status: {product[3]}")
        else:
            logger.info("No products found in database")
            
    except Exception as e:
        logger.error(f"Error showing data: {e}")
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Populate Render database with sample data")
    parser.add_argument("--show", action="store_true", help="Show current data without inserting")
    parser.add_argument("--populate", action="store_true", help="Populate database with sample data")
    
    args = parser.parse_args()
    
    if args.show:
        show_current_data()
    elif args.populate:
        populate_database()
    else:
        # Default behavior: show current data, then ask if user wants to populate
        show_current_data()
        print("\n" + "="*80)
        print("To populate database with sample data, run: python populate_render_data.py --populate")
        print("To only show current data, run: python populate_render_data.py --show")
        print("="*80)

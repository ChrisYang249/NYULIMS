#!/usr/bin/env python3
"""
Script to insert sample products directly into the PostgreSQL database.
You can modify the PRODUCTS_DATA list below with your own product data.
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

# Lab orders data from Google Sheets - MODIFY THIS LIST WITH YOUR PRODUCTS
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
        "name": "C57 females",
        "quantity": 30,
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
        "name": "GAD Mutant Forward: CAC TGC ATT CTA GTT GTG GTT TG, GAD Wild type Forward: TCG TTG CAC TGA CGT GTT CT, GAD Common: AAC AGT TTG ATG AGT GAG GTG A",
        "quantity": 1,
        "catalog_number": "Ordered on 13-Sep-2023",
        "order_date": "2023-09-05",
        "requestor": "Priyam, Mohsin",
        "quotation_status": "Yes",
        "total_value": 176.87,
        "status": "Received",
        "requisition_id": "55360",
        "vendor": "Scientechnic",
        "chartfield": "76/71260/AD176",
        "notes": "1 of each primer",
        "storage": "Freezer"
    },
    {
        "name": "UCP1 qPCR primers GeneGlobe ID - PPM05164B-200",
        "quantity": 1,
        "catalog_number": "330001",
        "order_date": "2023-09-19",
        "requestor": "Yana",
        "quotation_status": "",
        "total_value": 0.0,
        "status": "Requested",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Freezer"
    },
    {
        "name": "Biorender membership",
        "quantity": 1,
        "catalog_number": "1 year (22/Sep/23 to 2/Sep/24)",
        "order_date": "2023-09-22",
        "requestor": "Lab",
        "quotation_status": "Direct invoice",
        "total_value": 1188.0,
        "status": "Renewed on 8-Nov-23",
        "requisition_id": "",
        "vendor": "Biorender",
        "chartfield": "Biology P-card",
        "notes": "",
        "storage": "Other"
    },
    {
        "name": "C57 male mice",
        "quantity": 170,
        "catalog_number": "",
        "order_date": "2023-10-04",
        "requestor": "Lab",
        "quotation_status": "Through vivarium",
        "total_value": 0.0,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "76/71260/AD176",
        "notes": "",
        "storage": "Other"
    },
    {
        "name": "C57 female mice",
        "quantity": 20,
        "catalog_number": "",
        "order_date": "2023-10-04",
        "requestor": "Lab",
        "quotation_status": "Through vivarium",
        "total_value": 0.0,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "76/71260/AD176",
        "notes": "",
        "storage": "Other"
    },
    {
        "name": "Telemetry devices",
        "quantity": 60,
        "catalog_number": "",
        "order_date": "2023-11-24",
        "requestor": "Yana",
        "quotation_status": "Asked for",
        "total_value": 0.0,
        "status": "",
        "requisition_id": "",
        "vendor": "AniPill Molecular Biology Products-Middle East",
        "chartfield": "",
        "notes": "",
        "storage": "Other"
    },
    {
        "name": "ZymoBIOMICS DNA Miniprep Kit",
        "quantity": 2,
        "catalog_number": "D4300",
        "order_date": "2023-12-19",
        "requestor": "Balazs",
        "quotation_status": "Quote received on",
        "total_value": 2050.65,
        "status": "",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Freezer"
    },
    {
        "name": "DNEasy PowerSoil Pro Kit QIAGEN",
        "quantity": 5,
        "catalog_number": "47014",
        "order_date": "2023-12-19",
        "requestor": "Balazs",
        "quotation_status": "Asked for",
        "total_value": 7500.0,
        "status": "",
        "requisition_id": "PO# 55345",
        "vendor": "ONE HEALTH",
        "chartfield": "",
        "notes": "",
        "storage": "Freezer"
    },
    {
        "name": "CHEMSTOCK CHEMICALS 20001",
        "quantity": 1,
        "catalog_number": "2000.038.0004",
        "order_date": "2024-01-04",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 18.24,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "LSS CHEMICALS 1009832511",
        "quantity": 3,
        "catalog_number": "2000.005.0001",
        "order_date": "2024-01-04",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 69.45,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "Glacial Acetic Acid",
        "quantity": 1,
        "catalog_number": "2000.038.0004",
        "order_date": "2024-01-04",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 18.24,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "Ethanol (Absolute), from LSS",
        "quantity": 3,
        "catalog_number": "2000.005.0001",
        "order_date": "2024-01-04",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 69.45,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "C57 male mice",
        "quantity": 140,
        "catalog_number": "",
        "order_date": "2024-01-04",
        "requestor": "Lab",
        "quotation_status": "",
        "total_value": 0.0,
        "status": "Received on 02-Feb-2024",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Other"
    },
    {
        "name": "C57 female mice",
        "quantity": 10,
        "catalog_number": "",
        "order_date": "2024-01-04",
        "requestor": "Lab",
        "quotation_status": "",
        "total_value": 0.0,
        "status": "Received on 02-Feb-2024",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Other"
    },
    {
        "name": "VWR RACKS AND BOXES WRI479-2213",
        "quantity": 1,
        "catalog_number": "1000.029.0057",
        "order_date": "2024-01-12",
        "requestor": "Malvika, Balazs",
        "quotation_status": "Research Stores",
        "total_value": 3.05,
        "status": "",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "Book Molecular Biology of the Cell Hardcover",
        "quantity": 1,
        "catalog_number": "ISBN 13; 978-0393884821",
        "order_date": "2024-01-23",
        "requestor": "Book for Lab",
        "quotation_status": "Amazon",
        "total_value": 472.0,
        "status": "",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "Biology P-car 76/71260/AD",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "VWR GLOVE VWRI112-2372",
        "quantity": 4,
        "catalog_number": "4000.013.0005",
        "order_date": "2024-01-23",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 38.16,
        "status": "",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "VWR GLOVE VWRI112-2373",
        "quantity": 3,
        "catalog_number": "4000.013.0001",
        "order_date": "2024-01-23",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 29.40,
        "status": "",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "VWR GLOVE VWRI112-2371",
        "quantity": 1,
        "catalog_number": "4000.013.0003",
        "order_date": "2024-01-23",
        "requestor": "Malvika",
        "quotation_status": "Research Stores",
        "total_value": 8.91,
        "status": "",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
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
        "requestor": "Priyam for lab",
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
        "name": "Peel away molds",
        "quantity": 1,
        "catalog_number": "18646A-1",
        "order_date": "2025-03-11",
        "requestor": "Priyam for lab",
        "quotation_status": "Provided",
        "total_value": 1678.0,
        "status": "Received",
        "requisition_id": "63123",
        "vendor": "Polysciences",
        "chartfield": "76-71260-ADHPG-AD176-00011",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "Osmometer",
        "quantity": 1,
        "catalog_number": "",
        "order_date": "2025-03-11",
        "requestor": "",
        "quotation_status": "",
        "total_value": 0.0,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "",
        "storage": "Shelf"
    },
    {
        "name": "Electrode puller",
        "quantity": 1,
        "catalog_number": "",
        "order_date": "2025-03-11",
        "requestor": "",
        "quotation_status": "",
        "total_value": 0.0,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
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
    },
    {
        "name": "NEBNext® Poly(A) mRNA Magnetic Isolation Module - 96 reactions",
        "quantity": 3,
        "catalog_number": "E7490L",
        "order_date": "2025-04-09",
        "requestor": "Yana",
        "quotation_status": "Provided",
        "total_value": 2655.45,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "885.15 USD",
        "storage": "Freezer"
    },
    {
        "name": "NEBNext Multiplex Oligos for Illumina (96 Unique Dual Index Primer Pairs) - 96 reactions",
        "quantity": 1,
        "catalog_number": "E6440S",
        "order_date": "2025-04-09",
        "requestor": "Yana",
        "quotation_status": "Provided",
        "total_value": 1871.1,
        "status": "Received",
        "requisition_id": "",
        "vendor": "",
        "chartfield": "",
        "notes": "623.7 USD",
        "storage": "Freezer"
    }
]

def insert_products():
    """Insert sample products into the database"""
    
    try:
        # Create database connection
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)
        db = SessionLocal()
        
        logger.info("Connected to database successfully")
        
        # Get a default user ID (assuming admin user exists)
        # You might need to adjust this based on your user setup
        result = db.execute(text("SELECT id FROM users LIMIT 1"))
        user = result.fetchone()
        if not user:
            logger.error("No users found in database. Please create a user first.")
            return
        default_user_id = user[0]
        
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
        
        # Commit all changes
        db.commit()
        logger.info(f"Successfully inserted {inserted_count} products")
        
        # Show summary
        result = db.execute(text("SELECT COUNT(*) FROM products"))
        total_products = result.fetchone()[0]
        logger.info(f"Total products in database: {total_products}")
        
    except Exception as e:
        logger.error(f"Database error: {e}")
        if 'db' in locals():
            db.rollback()
    finally:
        if 'db' in locals():
            db.close()

def show_current_products():
    """Show current products in the database"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=True, bind=engine)
        db = SessionLocal()
        
        result = db.execute(text("""
            SELECT id, name, quantity, catalog_number, status, vendor, total_value 
            FROM products 
            ORDER BY created_at DESC 
            LIMIT 10
        """))
        
        products = result.fetchall()
        
        if products:
            logger.info("Current products in database:")
            logger.info("-" * 80)
            for product in products:
                logger.info(f"ID: {product[0]}, Name: {product[1]}, Qty: {product[2]}, Status: {product[4]}")
        else:
            logger.info("No products found in database")
            
    except Exception as e:
        logger.error(f"Error showing products: {e}")
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Insert sample products into the database")
    parser.add_argument("--show", action="store_true", help="Show current products without inserting")
    parser.add_argument("--insert", action="store_true", help="Insert sample products")
    
    args = parser.parse_args()
    
    if args.show:
        show_current_products()
    elif args.insert:
        insert_products()
    else:
        # Default behavior: show current products, then ask if user wants to insert
        show_current_products()
        print("\n" + "="*80)
        print("To insert sample products, run: python insert_sample_products.py --insert")
        print("To only show current products, run: python insert_sample_products.py --show")
        print("="*80)

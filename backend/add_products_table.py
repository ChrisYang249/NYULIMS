#!/usr/bin/env python3
"""
Migration script to add products table to the database.
Run this script to create the products table and add sample data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.product import Product, QuotationStatus, ProductStatus, Requestor
from app.models.user import User
from datetime import datetime

def create_products_table():
    """Create the products table in the database."""
    
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Create the products table
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                quantity INTEGER NOT NULL,
                catalog_number VARCHAR,
                order_date TIMESTAMP WITH TIME ZONE NOT NULL,
                requestor VARCHAR NOT NULL,
                quotation_status VARCHAR,
                total_value FLOAT,
                status VARCHAR,
                requisition_id VARCHAR,
                vendor VARCHAR NOT NULL,
                chartfield VARCHAR,
                notes TEXT,
                created_by_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Create index on commonly queried fields
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_requestor ON products(requestor);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_products_order_date ON products(order_date);"))
        
        print("✅ Products table created successfully!")

def add_sample_data():
    """Add sample product data to the database."""
    
    # Create database engine and session
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get the first user (admin) to use as created_by
        admin_user = db.query(User).first()
        if not admin_user:
            print("❌ No users found in database. Please create a user first.")
            return
        
        # Sample product data based on the spreadsheet
        sample_products = [
            {
                "name": "C57 males",
                "quantity": 150,
                "catalog_number": "10/1/1499",
                "order_date": datetime(2023, 9, 1),
                "requestor": Requestor.LAB,
                "quotation_status": QuotationStatus.NO,
                "total_value": 2600.0,
                "status": ProductStatus.RECEIVED,
                "requisition_id": "55159",
                "vendor": "Tochris",
                "chartfield": "76/71260/AD176",
                "notes": "Lab mice for experiments",
                "created_by_id": admin_user.id
            },
            {
                "name": "C57 females",
                "quantity": 30,
                "catalog_number": "2 (SKU)",
                "order_date": datetime(2023, 9, 12),
                "requestor": Requestor.YANA,
                "quotation_status": QuotationStatus.YES,
                "total_value": 538.0,
                "status": ProductStatus.RECEIVED,
                "vendor": "Tochris",
                "chartfield": "76/71260/AD176",
                "notes": "Female mice for breeding",
                "created_by_id": admin_user.id
            },
            {
                "name": "CL 316243 disodium salt, 10 mg",
                "quantity": 2,
                "catalog_number": "330001",
                "order_date": datetime(2023, 9, 13),
                "requestor": Requestor.MOHSIN,
                "quotation_status": QuotationStatus.YES_AMAZON_LINK,
                "total_value": 176.87,
                "status": ProductStatus.REQUESTED,
                "vendor": "Amazon",
                "chartfield": "Biology P-card",
                "notes": "Chemical for research",
                "created_by_id": admin_user.id
            },
            {
                "name": "GAD Mutant Forward",
                "quantity": 1,
                "catalog_number": "74804",
                "order_date": datetime(2023, 9, 19),
                "requestor": Requestor.PRIYAM_MOHSIN,
                "quotation_status": QuotationStatus.REQUESTED,
                "total_value": 1188.0,
                "status": ProductStatus.PENDING,
                "vendor": "Scientechnic",
                "chartfield": "76/71260/AD176",
                "notes": "Primer for PCR",
                "created_by_id": admin_user.id
            },
            {
                "name": "Biorender membership",
                "quantity": 1,
                "order_date": datetime(2023, 9, 22),
                "requestor": Requestor.LAB,
                "quotation_status": QuotationStatus.DIRECT_INVOICE,
                "total_value": 225.0,
                "status": ProductStatus.RENEWED,
                "vendor": "Biorender",
                "chartfield": "Biology P-card",
                "notes": "Annual subscription renewed on 8-Nov-23",
                "created_by_id": admin_user.id
            }
        ]
        
        # Add sample products to database
        for product_data in sample_products:
            product = Product(**product_data)
            db.add(product)
        
        db.commit()
        print(f"✅ Added {len(sample_products)} sample products to database!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error adding sample data: {e}")
    finally:
        db.close()

def main():
    """Main function to run the migration."""
    print("🚀 Starting products table migration...")
    
    try:
        # Create the products table
        create_products_table()
        
        # Add sample data
        add_sample_data()
        
        print("🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

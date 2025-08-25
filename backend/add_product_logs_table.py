#!/usr/bin/env python3
"""
Migration script to add ProductLog table for tracking product changes.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.db.base import Base
from app.models.product import ProductLog

def create_product_logs_table():
    """Create the product_logs table."""
    engine = create_engine(settings.DATABASE_URL)
    
    # Check if table already exists
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'product_logs'
            );
        """))
        table_exists = result.scalar()
        
        if table_exists:
            print("Table 'product_logs' already exists. Skipping creation.")
            return
    
    # Create the table
    try:
        ProductLog.__table__.create(engine, checkfirst=True)
        print("✅ Successfully created 'product_logs' table")
    except Exception as e:
        print(f"❌ Error creating 'product_logs' table: {e}")
        raise

if __name__ == "__main__":
    print("🔄 Creating product_logs table...")
    create_product_logs_table()
    print("✅ Migration completed successfully!")

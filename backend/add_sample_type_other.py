#!/usr/bin/env python3
"""Add sample_type_other field to samples table"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def add_sample_type_other():
    """Add sample_type_other column to samples table"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='samples' AND column_name='sample_type_other'
        """))
        
        if result.rowcount > 0:
            print("Column sample_type_other already exists")
            return
        
        # Add the column
        print("Adding sample_type_other column to samples table...")
        conn.execute(text("""
            ALTER TABLE samples
            ADD COLUMN sample_type_other VARCHAR
        """))
        conn.commit()
        
        print("Successfully added sample_type_other column")

if __name__ == "__main__":
    add_sample_type_other()
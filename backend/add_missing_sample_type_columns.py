#!/usr/bin/env python3
"""Add missing columns to sample_types table"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def add_missing_columns():
    """Add missing columns to sample_types table"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check which columns exist
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='sample_types'
        """))
        
        existing_columns = {row[0] for row in result}
        print(f"Existing columns: {existing_columns}")
        
        # Add missing columns
        if 'created_by_id' not in existing_columns:
            print("Adding created_by_id column...")
            conn.execute(text("""
                ALTER TABLE sample_types
                ADD COLUMN created_by_id INTEGER
            """))
            
        if 'updated_by_id' not in existing_columns:
            print("Adding updated_by_id column...")
            conn.execute(text("""
                ALTER TABLE sample_types
                ADD COLUMN updated_by_id INTEGER
            """))
        
        conn.commit()
        print("Successfully added missing columns")

if __name__ == "__main__":
    add_missing_columns()
#!/usr/bin/env python3
"""
Add elution_volume field to samples table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def add_elution_volume():
    """Add elution_volume column to samples table"""
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'samples' 
                AND column_name = 'elution_volume'
            """))
            
            if result.fetchone():
                print("elution_volume column already exists in samples table")
                return
            
            # Add elution_volume column
            print("Adding elution_volume column to samples table...")
            conn.execute(text("""
                ALTER TABLE samples 
                ADD COLUMN elution_volume FLOAT
            """))
            conn.commit()
            
            print("Successfully added elution_volume column")
            
            # Set default value for existing samples
            print("Setting default elution volume to 100 µL for existing samples...")
            conn.execute(text("""
                UPDATE samples 
                SET elution_volume = 100 
                WHERE elution_volume IS NULL
            """))
            conn.commit()
            
            print("Migration completed successfully!")
            
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_elution_volume()
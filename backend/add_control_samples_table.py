#!/usr/bin/env python3

"""Add control_samples table and update plate statuses"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_control_samples_table():
    """Add control_samples table and update extraction plate statuses"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment")
        sys.exit(1)
    
    # Create engine
    engine = create_engine(database_url)
    
    try:
        # First, add enum values (need separate transaction)
        with engine.begin() as conn:
            # Check if plate status enum needs updating
            print("Checking plate status enum...")
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'platestatus' AND enumlabel = 'draft'
            """))
            
            if result.first() is None:
                print("Adding new plate statuses...")
                # Add new enum values (case-sensitive)
                conn.execute(text("ALTER TYPE platestatus ADD VALUE 'draft' BEFORE 'PLANNING'"))
                conn.execute(text("ALTER TYPE platestatus ADD VALUE 'finalized' AFTER 'draft'"))
                print("Added new enum values")
        
        # Now handle table creation and data updates
        with engine.begin() as conn:
            # Check if control_samples table already exists
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'control_samples'
            """))
            
            if result.first() is not None:
                print("Table 'control_samples' already exists")
            else:
                print("Creating control_samples table...")
                conn.execute(text("""
                    CREATE TABLE control_samples (
                        id SERIAL PRIMARY KEY,
                        control_id VARCHAR UNIQUE NOT NULL,
                        plate_id INTEGER NOT NULL REFERENCES extraction_plates(id) ON DELETE CASCADE,
                        control_type VARCHAR NOT NULL,
                        control_category VARCHAR NOT NULL,
                        set_number INTEGER DEFAULT 1,
                        well_position VARCHAR NOT NULL,
                        well_row VARCHAR,
                        well_column INTEGER,
                        lot_number VARCHAR,
                        expiration_date DATE,
                        supplier VARCHAR,
                        product_name VARCHAR,
                        input_volume FLOAT DEFAULT 250,
                        elution_volume FLOAT DEFAULT 100,
                        concentration FLOAT,
                        ratio_260_280 FLOAT,
                        ratio_260_230 FLOAT,
                        qc_pass BOOLEAN,
                        qc_notes TEXT,
                        notes TEXT,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                print("Successfully created control_samples table")
            
            # Update existing plate statuses
            print("Updating existing plate statuses...")
            # Update existing 'PLANNING' status to 'draft'
            result = conn.execute(text("""
                UPDATE extraction_plates 
                SET status = 'draft' 
                WHERE status = 'PLANNING'
            """))
            print(f"Updated {result.rowcount} plates from PLANNING to draft")
            
            # Update existing 'READY' status to 'finalized'
            result = conn.execute(text("""
                UPDATE extraction_plates 
                SET status = 'finalized' 
                WHERE status = 'READY'
            """))
            print(f"Updated {result.rowcount} plates from READY to finalized")
            
            print("Migration completed successfully!")
            
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_control_samples_table()
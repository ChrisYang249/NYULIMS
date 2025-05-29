#!/usr/bin/env python3
"""
Add new fields to Sample table and create StorageLocation table
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost/lims_db"
)

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    with engine.begin() as conn:
        # Create storage_locations table
        print("Creating storage_locations table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS storage_locations (
                id SERIAL PRIMARY KEY,
                freezer VARCHAR NOT NULL,
                shelf VARCHAR NOT NULL,
                box VARCHAR NOT NULL,
                position VARCHAR,
                is_available BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by_id INTEGER,
                updated_by_id INTEGER
            );
        """))
        
        # Add new fields to samples table
        print("Adding new fields to samples table...")
        
        # Check if columns exist before adding
        conn.execute(text("""
            DO $$ 
            BEGIN
                -- Add storage_location_id
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='storage_location_id'
                ) THEN
                    ALTER TABLE samples ADD COLUMN storage_location_id INTEGER 
                    REFERENCES storage_locations(id);
                END IF;
                
                -- Add target_depth
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='target_depth'
                ) THEN
                    ALTER TABLE samples ADD COLUMN target_depth FLOAT;
                END IF;
                
                -- Add well_location
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='well_location'
                ) THEN
                    ALTER TABLE samples ADD COLUMN well_location VARCHAR;
                END IF;
                
                -- Add due_date
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='due_date'
                ) THEN
                    ALTER TABLE samples ADD COLUMN due_date TIMESTAMP WITH TIME ZONE;
                END IF;
            END $$;
        """))
        
        # Update sample_type enum to include dna_plate
        print("Updating sample_type enum...")
        conn.execute(text("""
            DO $$ 
            BEGIN
                -- Check if dna_plate exists in enum
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'dna_plate' 
                    AND enumtypid = (
                        SELECT oid FROM pg_type WHERE typname = 'sampletype'
                    )
                ) THEN
                    ALTER TYPE sampletype ADD VALUE IF NOT EXISTS 'dna_plate' AFTER 'milk';
                END IF;
            END $$;
        """))
        
        print("Migration completed successfully!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
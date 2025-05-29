#!/usr/bin/env python3
"""
Add queue-related fields to samples table for workflow management
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
        print("Adding queue-related fields to samples table...")
        
        # Add new fields to samples table
        conn.execute(text("""
            DO $$ 
            BEGIN
                -- Add queue_priority for ordering within queues
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='queue_priority'
                ) THEN
                    ALTER TABLE samples ADD COLUMN queue_priority INTEGER DEFAULT 0;
                END IF;
                
                -- Add queue_notes for stage-specific notes
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='queue_notes'
                ) THEN
                    ALTER TABLE samples ADD COLUMN queue_notes TEXT;
                END IF;
                
                -- Add failed_stage to track where failure occurred
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='failed_stage'
                ) THEN
                    ALTER TABLE samples ADD COLUMN failed_stage VARCHAR;
                END IF;
                
                -- Add failure_reason for documentation
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='failure_reason'
                ) THEN
                    ALTER TABLE samples ADD COLUMN failure_reason TEXT;
                END IF;
                
                -- Add reprocess_count to track E2, P2, S2, etc.
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='reprocess_count'
                ) THEN
                    ALTER TABLE samples ADD COLUMN reprocess_count INTEGER DEFAULT 0;
                END IF;
                
                -- Add batch_id for grouping samples in workflow
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='batch_id'
                ) THEN
                    ALTER TABLE samples ADD COLUMN batch_id VARCHAR;
                END IF;
                
                -- Add expected completion dates for each stage
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='extraction_due_date'
                ) THEN
                    ALTER TABLE samples ADD COLUMN extraction_due_date TIMESTAMP WITH TIME ZONE;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='library_prep_due_date'
                ) THEN
                    ALTER TABLE samples ADD COLUMN library_prep_due_date TIMESTAMP WITH TIME ZONE;
                END IF;
                
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name='samples' AND column_name='sequencing_due_date'
                ) THEN
                    ALTER TABLE samples ADD COLUMN sequencing_due_date TIMESTAMP WITH TIME ZONE;
                END IF;
            END $$;
        """))
        
        # Create indexes for better queue performance
        print("Creating indexes for queue operations...")
        conn.execute(text("""
            -- Index for queue filtering
            CREATE INDEX IF NOT EXISTS idx_samples_status_priority 
            ON samples(status, queue_priority DESC);
            
            -- Index for failed samples
            CREATE INDEX IF NOT EXISTS idx_samples_failed_stage 
            ON samples(failed_stage) WHERE failed_stage IS NOT NULL;
            
            -- Index for batch operations
            CREATE INDEX IF NOT EXISTS idx_samples_batch_id 
            ON samples(batch_id) WHERE batch_id IS NOT NULL;
        """))
        
        print("Migration completed successfully!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
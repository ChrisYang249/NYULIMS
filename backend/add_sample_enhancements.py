"""
Database migration script to add sample status enhancements
Including: ACCESSIONING status, pre-treatment, spike-ins, flags, and discrepancy tracking
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Add new fields for sample status enhancements"""
    engine = create_engine(settings.DATABASE_URL)
    
    # First, handle enum changes separately since they need to be committed
    try:
        with engine.begin() as conn:
            # Check if ACCESSIONING status exists in the enum
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum 
                WHERE enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'samplestatus'
                ) AND enumlabel = 'ACCESSIONING';
            """))
            
            if not result.fetchone():
                logger.info("Adding ACCESSIONING to SampleStatus enum...")
                # Add ACCESSIONING status after RECEIVED
                conn.execute(text("""
                    ALTER TYPE samplestatus ADD VALUE IF NOT EXISTS 'ACCESSIONING' AFTER 'RECEIVED';
                """))
                logger.info("ACCESSIONING status added successfully")
            else:
                logger.info("ACCESSIONING status already exists in enum")
    except Exception as e:
        logger.error(f"Failed to add enum value: {str(e)}")
        raise
    
    # Now handle the rest of the migration
    try:
        with engine.begin() as conn:
            # Add new columns to samples table
            logger.info("Adding new columns to samples table...")
            
            # Pre-treatment fields
            conn.execute(text("""
                ALTER TABLE samples 
                ADD COLUMN IF NOT EXISTS pretreatment_type VARCHAR,
                ADD COLUMN IF NOT EXISTS pretreatment_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS spike_in_type VARCHAR;
            """))
            
            # Flag fields
            conn.execute(text("""
                ALTER TABLE samples 
                ADD COLUMN IF NOT EXISTS has_flag BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS flag_abbreviation VARCHAR,
                ADD COLUMN IF NOT EXISTS flag_notes TEXT;
            """))
            
            # Discrepancy fields
            conn.execute(text("""
                ALTER TABLE samples 
                ADD COLUMN IF NOT EXISTS has_discrepancy BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS discrepancy_notes TEXT,
                ADD COLUMN IF NOT EXISTS discrepancy_resolved BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS discrepancy_resolution_date TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS discrepancy_resolved_by_id INTEGER REFERENCES users(id);
            """))
            
            # Create discrepancy_approvals table
            logger.info("Creating discrepancy_approvals table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS discrepancy_approvals (
                    id SERIAL PRIMARY KEY,
                    sample_id INTEGER NOT NULL REFERENCES samples(id),
                    discrepancy_type VARCHAR NOT NULL,
                    discrepancy_details TEXT NOT NULL,
                    approved BOOLEAN DEFAULT FALSE,
                    approved_by_id INTEGER REFERENCES users(id),
                    approval_date TIMESTAMP WITH TIME ZONE,
                    approval_reason TEXT,
                    signature_meaning VARCHAR DEFAULT 'I approve this sample to proceed despite the noted discrepancy',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            # Create indexes (skip the ACCESSIONING index if enum wasn't added)
            logger.info("Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_samples_has_flag ON samples(has_flag) WHERE has_flag = TRUE;
                CREATE INDEX IF NOT EXISTS idx_samples_has_discrepancy ON samples(has_discrepancy) WHERE has_discrepancy = TRUE;
                CREATE INDEX IF NOT EXISTS idx_discrepancy_approvals_sample_id ON discrepancy_approvals(sample_id);
                CREATE INDEX IF NOT EXISTS idx_discrepancy_approvals_approved ON discrepancy_approvals(approved);
            """))
            
            # Try to create the ACCESSIONING index separately
            try:
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_samples_status_accessioning ON samples(status) WHERE status = 'ACCESSIONING';
                """))
            except Exception as e:
                logger.warning(f"Could not create ACCESSIONING index: {str(e)}")
            
            # Add audit triggers for discrepancy_approvals
            logger.info("Adding audit triggers...")
            conn.execute(text("""
                -- Add update trigger for discrepancy_approvals
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
                
                DROP TRIGGER IF EXISTS update_discrepancy_approvals_updated_at ON discrepancy_approvals;
                
                CREATE TRIGGER update_discrepancy_approvals_updated_at 
                BEFORE UPDATE ON discrepancy_approvals 
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
            """))
            
            logger.info("Migration completed successfully!")
            
            # Log the current state
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'samples' 
                AND column_name IN (
                    'pretreatment_type', 'pretreatment_date', 'spike_in_type',
                    'has_flag', 'flag_abbreviation', 'flag_notes',
                    'has_discrepancy', 'discrepancy_notes', 'discrepancy_resolved'
                )
                ORDER BY column_name;
            """))
            
            logger.info("\nNew columns in samples table:")
            for row in result:
                logger.info(f"  {row.column_name}: {row.data_type} (nullable: {row.is_nullable})")
            
            # Check enum values
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum 
                WHERE enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'samplestatus'
                )
                ORDER BY enumsortorder;
            """))
            
            logger.info("\nSampleStatus enum values:")
            for row in result:
                logger.info(f"  - {row.enumlabel}")
                
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("Starting sample enhancements migration...")
    run_migration()
    logger.info("Migration completed!")
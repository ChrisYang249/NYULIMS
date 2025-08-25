#!/usr/bin/env python3
"""
Database cleanup script to remove sample and project related tables.
This will clean up the database to focus only on inventory management.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def cleanup_database():
    """Remove sample and project related tables from the database."""
    
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Tables to drop (sample and project related)
    tables_to_drop = [
        # Sample related tables
        "sample_logs",
        "extraction_plan_samples", 
        "prep_plan_samples",
        "sequencing_run_samples",
        "extraction_plate_well_assignments",
        "extraction_plates",
        "control_samples",
        "samples",
        "sample_types",
        
        # Project related tables
        "project_logs",
        "project_attachments", 
        "client_project_configs",
        "projects",
        
        # Workflow related tables
        "extraction_plans",
        "prep_plans", 
        "sequencing_runs",
        
        # Other tables that might not be needed
        "deletion_logs",  # We'll recreate this if needed
    ]
    
    print("🧹 Starting database cleanup...")
    
    with engine.begin() as conn:
        # Drop tables in reverse dependency order
        for table in tables_to_drop:
            try:
                conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                print(f"✅ Dropped table: {table}")
            except Exception as e:
                print(f"⚠️  Could not drop {table}: {e}")
    
    print("✅ Database cleanup completed!")
    print("\n📋 Remaining tables:")
    
    # Show remaining tables
    with engine.begin() as conn:
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """))
        
        for row in result:
            print(f"  - {row[0]}")

def create_deletion_logs_table():
    """Recreate deletion logs table for product tracking."""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS deletion_logs (
                id SERIAL PRIMARY KEY,
                table_name VARCHAR NOT NULL,
                record_id INTEGER NOT NULL,
                deleted_by_id INTEGER REFERENCES users(id),
                deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                record_data JSONB
            );
        """))
        
        print("✅ Recreated deletion_logs table")

def main():
    """Main function to run the cleanup."""
    print("🚀 Starting database cleanup for inventory system...")
    
    try:
        # Clean up old tables
        cleanup_database()
        
        # Recreate deletion logs table
        create_deletion_logs_table()
        
        print("\n🎉 Database cleanup completed successfully!")
        print("📦 The database now contains only inventory-related tables.")
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

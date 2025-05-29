#!/usr/bin/env python3
"""
Add DELETED status to SampleStatus enum
"""
import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.getenv("DATABASE_SERVER", "localhost")
DB_PORT = os.getenv("DATABASE_PORT", "5432")
DB_NAME = os.getenv("DATABASE_NAME", "lims_db")
DB_USER = os.getenv("DATABASE_USER", "lims_user")
DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "")

def add_deleted_status():
    """Add DELETED to SampleStatus enum"""
    conn = None
    cursor = None
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        print(f"Connected to database: {DB_NAME}")
        
        # Check current enum values
        cursor.execute("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'samplestatus')
            ORDER BY enumsortorder
        """)
        
        current_values = [row[0] for row in cursor.fetchall()]
        print(f"\nCurrent SampleStatus values: {current_values}")
        
        if 'DELETED' in current_values:
            print("DELETED status already exists!")
            return
        
        # Add DELETED to the enum
        print("\nAdding DELETED status to SampleStatus enum...")
        cursor.execute("""
            ALTER TYPE samplestatus ADD VALUE IF NOT EXISTS 'DELETED'
        """)
        
        # Verify the change
        cursor.execute("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'samplestatus')
            ORDER BY enumsortorder
        """)
        
        new_values = [row[0] for row in cursor.fetchall()]
        print(f"\nUpdated SampleStatus values: {new_values}")
        
        # Commit the changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    add_deleted_status()
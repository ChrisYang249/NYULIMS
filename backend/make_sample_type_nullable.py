#!/usr/bin/env python3
"""
Make sample_type column nullable to support transition to sample_type_id
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

def make_sample_type_nullable():
    """Make sample_type column nullable"""
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
        
        # Make sample_type column nullable
        print("\nMaking sample_type column nullable...")
        cursor.execute("""
            ALTER TABLE samples 
            ALTER COLUMN sample_type DROP NOT NULL
        """)
        
        # Check if the change was successful
        cursor.execute("""
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'samples' 
            AND column_name IN ('sample_type', 'sample_type_id')
            ORDER BY column_name
        """)
        
        print("\nColumn status after migration:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[2]}, nullable={row[1]}")
        
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
    make_sample_type_nullable()
#!/usr/bin/env python3
"""
Add processing_sample_count field to projects table
"""
import psycopg2
from psycopg2 import sql
import sys
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection from DATABASE_URL"""
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("DATABASE_URL not found in environment variables")
        sys.exit(1)
    
    # Parse the database URL
    parsed = urlparse(database_url)
    
    return psycopg2.connect(
        host=parsed.hostname,
        database=parsed.path[1:],  # Remove leading '/'
        user=parsed.username,
        password=parsed.password,
        port=parsed.port or 5432
    )

def add_processing_count_field():
    """Add processing_sample_count field to projects table"""
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("Adding processing_sample_count field to projects table...")
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='projects' AND column_name='processing_sample_count'
        """)
        
        if cursor.fetchone():
            print("processing_sample_count column already exists")
            return
        
        # Add the new column
        cursor.execute("""
            ALTER TABLE projects 
            ADD COLUMN processing_sample_count INTEGER;
        """)
        
        conn.commit()
        print("Successfully added processing_sample_count field")
        
        # Show some stats
        cursor.execute("SELECT COUNT(*) FROM projects")
        count = cursor.fetchone()[0]
        print(f"Updated table structure for {count} existing projects")
        
        conn.close()
        
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        print("\nMake sure PostgreSQL is running and the database exists.")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_processing_count_field()
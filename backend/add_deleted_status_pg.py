#!/usr/bin/env python3
"""
Add 'deleted' status to project_status enum in PostgreSQL
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

def add_deleted_status():
    """Add 'deleted' to the project status enum"""
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("Checking current enum values...")
        
        # Check if the enum type exists and get its values
        cursor.execute("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'projectstatus'
            )
            ORDER BY enumsortorder;
        """)
        
        current_values = [row[0] for row in cursor.fetchall()]
        
        if not current_values:
            print("No projectstatus enum found. It might be created differently.")
            # Check column type directly
            cursor.execute("""
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'projects' AND column_name = 'status';
            """)
            result = cursor.fetchone()
            if result:
                print(f"Status column info: {result}")
            else:
                print("No projects table found")
                return
        else:
            print(f"Current enum values: {current_values}")
            
            if 'deleted' in current_values:
                print("'deleted' status already exists in the enum")
                return
            
            # Add the new value to the enum
            print("Adding 'deleted' to the enum...")
            cursor.execute("ALTER TYPE projectstatus ADD VALUE IF NOT EXISTS 'deleted';")
            conn.commit()
            print("Successfully added 'deleted' status to the enum")
        
        conn.close()
        
    except psycopg2.OperationalError as e:
        print(f"Database connection error: {e}")
        print("\nMake sure PostgreSQL is running and the database exists.")
        print("You might need to run: createdb lims_db")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_deleted_status()
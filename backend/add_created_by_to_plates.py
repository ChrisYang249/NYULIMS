#\!/usr/bin/env python3

"""Add created_by_id to extraction_plates table"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def add_created_by_to_plates():
    """Add created_by_id column to extraction_plates table"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not set in environment")
        sys.exit(1)
    
    # Create engine
    engine = create_engine(database_url)
    
    try:
        with engine.begin() as conn:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'extraction_plates' 
                AND column_name = 'created_by_id'
            """))
            
            if result.first() is not None:
                print("Column 'created_by_id' already exists in extraction_plates table")
                return
            
            # Add created_by_id column
            print("Adding created_by_id column to extraction_plates table...")
            conn.execute(text("""
                ALTER TABLE extraction_plates 
                ADD COLUMN created_by_id INTEGER REFERENCES users(id)
            """))
            
            print("Successfully added created_by_id column to extraction_plates table")
            
    except SQLAlchemyError as e:
        print(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_created_by_to_plates()

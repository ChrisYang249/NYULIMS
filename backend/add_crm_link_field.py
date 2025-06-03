#!/usr/bin/env python3
"""
Add crm_link field to projects table
"""

import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent / "app"))

from sqlalchemy import create_engine, text
from app.core.config import settings

def add_crm_link_field():
    """Add crm_link column to projects table"""
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.connect() as connection:
            # Check if column already exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'projects' 
                AND column_name = 'crm_link'
            """))
            
            if result.fetchone():
                print("✅ crm_link column already exists")
                return
            
            # Add the crm_link column
            print("Adding crm_link column to projects table...")
            connection.execute(text("""
                ALTER TABLE projects 
                ADD COLUMN crm_link VARCHAR
            """))
            connection.commit()
            
            print("✅ Successfully added crm_link column to projects table")
            
    except Exception as e:
        print(f"❌ Error adding crm_link column: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = add_crm_link_field()
    if success:
        print("\n🎉 Database migration completed successfully!")
    else:
        print("\n💥 Database migration failed!")
        sys.exit(1)
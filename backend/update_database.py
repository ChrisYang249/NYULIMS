#!/usr/bin/env python3
"""Update database schema to match current models"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import engine
from sqlalchemy import text

def update_schema():
    """Add missing columns to existing tables"""
    
    with engine.connect() as conn:
        # Start transaction
        trans = conn.begin()
        
        try:
            # Add project_type to projects table
            print("Adding project_type column...")
            conn.execute(text("""
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS project_type VARCHAR
            """))
            
            # Add start_date to projects table
            print("Adding start_date column...")
            conn.execute(text("""
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE
            """))
            
            # Rename received_date to start_date if it exists
            print("Checking for received_date column...")
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='projects' AND column_name='received_date'
            """))
            if result.fetchone():
                print("Renaming received_date to start_date...")
                conn.execute(text("""
                    ALTER TABLE projects 
                    RENAME COLUMN received_date TO start_date
                """))
            
            # Create project_logs table if it doesn't exist
            print("Creating project_logs table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS project_logs (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id),
                    comment TEXT NOT NULL,
                    log_type VARCHAR DEFAULT 'comment',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE,
                    created_by_id INTEGER REFERENCES users(id),
                    updated_by_id INTEGER REFERENCES users(id)
                )
            """))
            
            # Update default status for existing projects
            print("Updating project statuses...")
            conn.execute(text("""
                UPDATE projects 
                SET status = 'pending' 
                WHERE status = 'received'
            """))
            
            # Set start_date for existing projects if null
            print("Setting start_date for existing projects...")
            conn.execute(text("""
                UPDATE projects 
                SET start_date = COALESCE(start_date, created_at, CURRENT_TIMESTAMP)
                WHERE start_date IS NULL
            """))
            
            # Set project_type for existing projects if null
            print("Setting default project_type for existing projects...")
            conn.execute(text("""
                UPDATE projects 
                SET project_type = 'WGS'
                WHERE project_type IS NULL
            """))
            
            # Commit transaction
            trans.commit()
            print("\nDatabase schema updated successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"\nError updating schema: {e}")
            raise

if __name__ == "__main__":
    update_schema()
#!/usr/bin/env python3
"""Migrate database to match new schema"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import engine
from sqlalchemy import text, inspect

def migrate():
    """Migrate database schema"""
    
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        trans = conn.begin()
        
        try:
            # 1. Rename received_date to start_date
            columns = [col['name'] for col in inspector.get_columns('projects')]
            
            if 'received_date' in columns and 'start_date' not in columns:
                print("Renaming received_date to start_date...")
                conn.execute(text("""
                    ALTER TABLE projects 
                    RENAME COLUMN received_date TO start_date
                """))
            
            # 2. Add project_type if missing
            if 'project_type' not in columns:
                print("Adding project_type column...")
                conn.execute(text("""
                    ALTER TABLE projects 
                    ADD COLUMN project_type VARCHAR
                """))
            
            # 3. Set default values
            print("Setting default values...")
            conn.execute(text("""
                UPDATE projects 
                SET project_type = 'WGS'
                WHERE project_type IS NULL
            """))
            
            # 4. Create project_logs table
            if 'project_logs' not in inspector.get_table_names():
                print("Creating project_logs table...")
                conn.execute(text("""
                    CREATE TABLE project_logs (
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
            
            trans.commit()
            print("\nMigration completed successfully!")
            
            # Show updated columns
            print("\nUpdated columns in projects table:")
            new_columns = inspector.get_columns('projects')
            for col in new_columns:
                print(f"  - {col['name']}")
            
        except Exception as e:
            trans.rollback()
            print(f"\nError during migration: {e}")
            raise

if __name__ == "__main__":
    migrate()
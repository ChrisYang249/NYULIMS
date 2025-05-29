#!/usr/bin/env python3
"""Check and update database schema"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.base import engine
from sqlalchemy import text, inspect

def check_and_update():
    """Check current schema and apply necessary updates"""
    
    inspector = inspect(engine)
    
    # Check existing columns in projects table
    columns = inspector.get_columns('projects')
    column_names = [col['name'] for col in columns]
    
    print("Current columns in projects table:")
    for col in column_names:
        print(f"  - {col}")
    
    with engine.connect() as conn:
        trans = conn.begin()
        
        try:
            # Add missing columns
            if 'project_type' not in column_names:
                print("\nAdding project_type column...")
                conn.execute(text("""
                    ALTER TABLE projects 
                    ADD COLUMN project_type VARCHAR
                """))
                conn.execute(text("""
                    UPDATE projects 
                    SET project_type = 'WGS'
                    WHERE project_type IS NULL
                """))
            
            # Ensure start_date has values
            print("\nEnsuring start_date has values...")
            conn.execute(text("""
                UPDATE projects 
                SET start_date = COALESCE(start_date, created_at, CURRENT_TIMESTAMP)
                WHERE start_date IS NULL
            """))
            
            # Create project_logs table
            if 'project_logs' not in inspector.get_table_names():
                print("\nCreating project_logs table...")
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
            print("\nDatabase updated successfully!")
            
        except Exception as e:
            trans.rollback()
            print(f"\nError: {e}")
            raise

if __name__ == "__main__":
    check_and_update()
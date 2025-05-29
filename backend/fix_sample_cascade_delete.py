#!/usr/bin/env python3
"""Fix cascade delete for sample relationships"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_cascade_delete():
    """Update foreign key constraints to cascade delete"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        print("Updating foreign key constraints to cascade delete...")
        
        # Tables that reference samples
        tables_to_update = [
            ('sample_logs', 'sample_logs_sample_id_fkey'),
            ('extraction_results', 'extraction_results_sample_id_fkey'),
            ('library_prep_results', 'library_prep_results_sample_id_fkey'),
            ('sequencing_run_samples', 'sequencing_run_samples_sample_id_fkey')
        ]
        
        for table_name, constraint_name in tables_to_update:
            try:
                # Check if table exists
                result = conn.execute(text(f"""
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = '{table_name}'
                """))
                
                if result.rowcount == 0:
                    print(f"Table {table_name} does not exist, skipping...")
                    continue
                
                # Drop the existing constraint
                conn.execute(text(f"""
                    ALTER TABLE {table_name} 
                    DROP CONSTRAINT IF EXISTS {constraint_name}
                """))
                
                # Add it back with CASCADE DELETE
                conn.execute(text(f"""
                    ALTER TABLE {table_name}
                    ADD CONSTRAINT {constraint_name}
                    FOREIGN KEY (sample_id) REFERENCES samples(id)
                    ON DELETE CASCADE
                """))
                
                print(f"Updated {table_name} foreign key to cascade delete")
                
            except Exception as e:
                print(f"Error updating {table_name}: {e}")
        
        conn.commit()
        print("\nSuccessfully updated cascade delete constraints")

if __name__ == "__main__":
    fix_cascade_delete()
#!/usr/bin/env python3
"""
Migrate existing barcodes to 7-digit sequential format
- Updates any barcodes that are not 7 digits
- Maintains reprocessing suffixes (e.g., -R1, -R2)
- Ensures all barcodes are sequential
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def migrate_barcodes():
    """Migrate barcodes to 7-digit sequential format"""
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    
    with Session(engine) as db:
        try:
            print("Migrating barcodes to 7-digit sequential format...")
            
            # First, get all samples ordered by creation date
            result = db.execute(text("""
                SELECT id, barcode, created_at, parent_sample_id
                FROM samples
                WHERE barcode NOT LIKE '%-%'  -- Exclude reprocessed samples
                ORDER BY created_at, id
            """))
            
            samples = result.fetchall()
            print(f"Found {len(samples)} primary samples to check")
            
            # Find the starting number
            # Check if any samples already have 7-digit barcodes
            max_barcode = 1000000  # Default starting point
            for sample in samples:
                if sample.barcode.isdigit() and len(sample.barcode) == 7:
                    max_barcode = max(max_barcode, int(sample.barcode) + 1)
            
            print(f"Starting sequential numbering from: {max_barcode}")
            
            # Update samples that don't have 7-digit barcodes
            updates = []
            for sample in samples:
                if not (sample.barcode.isdigit() and len(sample.barcode) == 7):
                    updates.append({
                        'id': sample.id,
                        'old_barcode': sample.barcode,
                        'new_barcode': str(max_barcode).zfill(7)
                    })
                    max_barcode += 1
            
            print(f"Need to update {len(updates)} barcodes")
            
            # Apply updates
            for update in updates:
                # Update the main sample
                db.execute(text("""
                    UPDATE samples 
                    SET barcode = :new_barcode
                    WHERE id = :id
                """), update)
                
                # Update any reprocessed samples that reference this barcode
                db.execute(text("""
                    UPDATE samples 
                    SET barcode = REPLACE(barcode, :old_barcode || '-', :new_barcode || '-')
                    WHERE parent_sample_id = :id
                    AND barcode LIKE :old_barcode || '-%'
                """), update)
                
                print(f"Updated barcode {update['old_barcode']} -> {update['new_barcode']}")
            
            # Now update reprocessed samples to ensure their base barcode is 7 digits
            result = db.execute(text("""
                SELECT s1.id, s1.barcode, s2.barcode as parent_barcode
                FROM samples s1
                JOIN samples s2 ON s1.parent_sample_id = s2.id
                WHERE s1.barcode LIKE '%-%'
            """))
            
            reprocessed = result.fetchall()
            print(f"\nChecking {len(reprocessed)} reprocessed samples")
            
            for sample in reprocessed:
                # Extract the suffix (e.g., -R1, -R2)
                parts = sample.barcode.split('-', 1)
                if len(parts) == 2:
                    base_barcode = parts[0]
                    suffix = parts[1]
                    
                    # If the parent has a 7-digit barcode and this doesn't match, update it
                    if len(sample.parent_barcode) == 7 and sample.parent_barcode.isdigit():
                        if base_barcode != sample.parent_barcode:
                            new_barcode = f"{sample.parent_barcode}-{suffix}"
                            db.execute(text("""
                                UPDATE samples 
                                SET barcode = :new_barcode
                                WHERE id = :id
                            """), {'id': sample.id, 'new_barcode': new_barcode})
                            print(f"Updated reprocessed barcode {sample.barcode} -> {new_barcode}")
            
            db.commit()
            print("\nBarcode migration completed successfully!")
            
            # Verify the results
            result = db.execute(text("""
                SELECT COUNT(*) as count, LENGTH(barcode) as barcode_length
                FROM samples
                WHERE barcode NOT LIKE '%-%'
                GROUP BY LENGTH(barcode)
                ORDER BY barcode_length
            """))
            
            print("\nBarcode length distribution after migration:")
            for row in result:
                print(f"  {row.barcode_length} digits: {row.count} samples")
                
        except Exception as e:
            print(f"Error migrating barcodes: {e}")
            db.rollback()
            raise

if __name__ == "__main__":
    migrate_barcodes()
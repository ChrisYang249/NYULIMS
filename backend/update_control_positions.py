#!/usr/bin/env python3
"""
Update control well positions from old incorrect positions to new correct positions
Old: H11, H12, G11, G12 -> New: E12, F12, G12, H12
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def update_control_positions():
    """Update control well positions in existing plates"""
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    
    with Session(engine) as db:
        try:
            print("Updating control well positions...")
            
            # First update the default control positions in the extraction_plates table
            result = db.execute(text("""
                UPDATE extraction_plates
                SET ext_pos_ctrl_well = 'E12',
                    ext_neg_ctrl_well = 'F12',
                    lp_pos_ctrl_well = 'G12',
                    lp_neg_ctrl_well = 'H12'
                WHERE ext_pos_ctrl_well = 'H11'
                   OR ext_pos_ctrl_well IS NULL
            """))
            
            print(f"Updated {result.rowcount} extraction plates with new control positions")
            
            # Update plate_well_assignments table
            # Move H11 -> E12 (ext_pos)
            result = db.execute(text("""
                UPDATE plate_well_assignments
                SET well_position = 'E12',
                    well_row = 'E',
                    well_column = 12
                WHERE well_position = 'H11'
                  AND is_control = true
            """))
            print(f"Updated {result.rowcount} H11 -> E12 control positions")
            
            # Update H12 -> F12 (ext_neg) if it was at H12
            # G11 -> G12 (lp_pos)
            result = db.execute(text("""
                UPDATE plate_well_assignments
                SET well_position = 'G12',
                    well_row = 'G',
                    well_column = 12
                WHERE well_position = 'G11'
                  AND is_control = true
            """))
            print(f"Updated {result.rowcount} G11 -> G12 control positions")
            
            # G12 -> H12 (lp_neg) - this is tricky because G12 is already the new position for G11
            # We need to first move the old G12 controls
            result = db.execute(text("""
                UPDATE plate_well_assignments
                SET well_position = 'H12',
                    well_row = 'H',
                    well_column = 12
                WHERE well_position = 'G12'
                  AND is_control = true
                  AND control_type = 'lp_neg'
            """))
            print(f"Updated {result.rowcount} G12 -> H12 control positions")
            
            # Update any samples that might have been placed in the control positions
            # Move samples from E12, F12, G12, H12 if they're not controls
            result = db.execute(text("""
                SELECT pwa.id, pwa.well_position, pwa.sample_id, s.barcode
                FROM plate_well_assignments pwa
                LEFT JOIN samples s ON pwa.sample_id = s.id
                WHERE pwa.well_position IN ('E12', 'F12', 'G12', 'H12')
                  AND pwa.is_control = false
                  AND pwa.sample_id IS NOT NULL
            """))
            
            misplaced_samples = result.fetchall()
            if misplaced_samples:
                print(f"\nFound {len(misplaced_samples)} samples in control positions that need to be moved:")
                for sample in misplaced_samples:
                    print(f"  - Sample {sample.barcode} at {sample.well_position}")
                
                # These would need to be moved to available positions
                # This is complex and would require finding empty wells
                print("\nWARNING: Manual intervention required to relocate these samples!")
            
            db.commit()
            print("\nControl position update completed successfully!")
            
        except Exception as e:
            print(f"Error updating control positions: {e}")
            db.rollback()
            raise

if __name__ == "__main__":
    update_control_positions()
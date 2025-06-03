#!/usr/bin/env python3
"""
Update control well positions in extraction plates from old positions to new positions
Old: H11, H12, G11, G12
New: E12, F12, G12, H12
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

def update_control_wells():
    """Update control well positions in extraction plates"""
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
    
    with Session(engine) as db:
        try:
            # Update extraction_plates table default values
            print("Updating extraction_plates control well positions...")
            
            # Update existing plates that have the old default values
            result = db.execute(text("""
                UPDATE extraction_plates 
                SET ext_pos_ctrl_well = 'E12',
                    ext_neg_ctrl_well = 'F12',
                    lp_pos_ctrl_well = 'G12',
                    lp_neg_ctrl_well = 'H12'
                WHERE ext_pos_ctrl_well = 'H11' 
                   OR ext_neg_ctrl_well = 'H12'
                   OR lp_pos_ctrl_well = 'G11' 
                   OR lp_neg_ctrl_well = 'G12'
            """))
            
            plates_updated = result.rowcount
            print(f"Updated {plates_updated} extraction plates")
            
            # Update plate_well_assignments table
            print("\nUpdating plate_well_assignments control positions...")
            
            # Map old positions to new positions
            position_map = {
                'H11': 'E12',
                'H12': 'F12',
                'G11': 'G12',
                'G12': 'H12'  # G12 stays as G12, but just in case
            }
            
            for old_pos, new_pos in position_map.items():
                result = db.execute(text("""
                    UPDATE plate_well_assignments
                    SET well_position = :new_pos,
                        well_row = :new_row,
                        well_column = :new_col
                    WHERE well_position = :old_pos AND is_control = true
                """), {
                    'old_pos': old_pos,
                    'new_pos': new_pos,
                    'new_row': new_pos[0],
                    'new_col': int(new_pos[1:])
                })
                
                if result.rowcount > 0:
                    print(f"Updated {result.rowcount} control wells from {old_pos} to {new_pos}")
            
            db.commit()
            print("\nControl well positions updated successfully!")
            
        except Exception as e:
            print(f"Error updating control wells: {e}")
            db.rollback()
            raise

if __name__ == "__main__":
    update_control_wells()
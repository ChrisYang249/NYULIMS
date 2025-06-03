"""Add extraction plates tables"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.base import Base
from app.models import ExtractionPlate, PlateWellAssignment

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Create tables
print("Creating extraction plates tables...")
try:
    # Create the extraction_plates and plate_well_assignments tables
    ExtractionPlate.__table__.create(engine, checkfirst=True)
    PlateWellAssignment.__table__.create(engine, checkfirst=True)
    print("✅ Created extraction_plates table")
    print("✅ Created plate_well_assignments table")
    
    # Add the foreign key column to samples table if it doesn't exist
    with engine.begin() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'samples' 
            AND column_name = 'extraction_plate_ref_id'
        """))
        
        if not result.fetchone():
            conn.execute(text("""
                ALTER TABLE samples 
                ADD COLUMN extraction_plate_ref_id INTEGER 
                REFERENCES extraction_plates(id)
            """))
            print("✅ Added extraction_plate_ref_id column to samples table")
        else:
            print("ℹ️  extraction_plate_ref_id column already exists in samples table")
    
    print("✅ Done!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    raise
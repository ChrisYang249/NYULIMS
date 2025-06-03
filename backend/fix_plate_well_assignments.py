"""Fix plate_well_assignments table - make sample_id nullable for control wells"""
from sqlalchemy import create_engine, text
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

print("Updating plate_well_assignments table...")
try:
    with engine.begin() as conn:
        # Make sample_id nullable
        conn.execute(text("""
            ALTER TABLE plate_well_assignments 
            ALTER COLUMN sample_id DROP NOT NULL
        """))
        print("✅ Made sample_id nullable in plate_well_assignments table")
    
    print("✅ Done!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    raise
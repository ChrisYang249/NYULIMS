"""Update extraction plates table - remove extraction_kit, add lysis_method"""
from sqlalchemy import create_engine, text
from app.core.config import settings

# Create engine
engine = create_engine(settings.DATABASE_URL)

# Update the extraction_plates table
print("Updating extraction_plates table...")
try:
    with engine.begin() as conn:
        # Check if extraction_kit column exists and remove it
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'extraction_plates' 
            AND column_name = 'extraction_kit'
        """))
        
        if result.fetchone():
            conn.execute(text("ALTER TABLE extraction_plates DROP COLUMN extraction_kit"))
            print("✅ Removed extraction_kit column")
        
        # Check if lysis_method column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'extraction_plates' 
            AND column_name = 'lysis_method'
        """))
        
        if not result.fetchone():
            conn.execute(text("ALTER TABLE extraction_plates ADD COLUMN lysis_method VARCHAR"))
            print("✅ Added lysis_method column")
        else:
            print("ℹ️  lysis_method column already exists")
    
    print("✅ Done!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    raise